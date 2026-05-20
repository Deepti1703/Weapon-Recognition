import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, random_split, Dataset
from torchvision import datasets, transforms
import os
import argparse
from tqdm import tqdm
import copy
import cv2
import numpy as np
from PIL import Image

# Import the existing model architecture
from ai_module import EnsembleModel, WEAPON_CLASSES, WOUND_CLASSES, device, preprocess_image_cv2

class CustomForensicDataset(Dataset):
    def __init__(self, root_dir, transform=None):
        self.root_dir = root_dir
        self.transform = transform
        self.samples = []
        self.classes = sorted(os.listdir(root_dir))
        self.class_to_idx = {cls_name: i for i, cls_name in enumerate(self.classes)}
        
        for cls_name in self.classes:
            cls_dir = os.path.join(root_dir, cls_name)
            if not os.path.isdir(cls_dir):
                continue
            for fname in os.listdir(cls_dir):
                if fname.lower().endswith(('.jpg', '.png', '.jpeg')):
                    self.samples.append((os.path.join(cls_dir, fname), self.class_to_idx[cls_name]))

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        img_path, target = self.samples[idx]
        
        # We must load exact bytes to pipe into preprocess_image_cv2 like the API endpoint does
        try:
            with open(img_path, "rb") as f:
                img_bytes = f.read()
            # Apply exact OpenCV logic
            img = preprocess_image_cv2(img_bytes)
        except Exception:
            # Fallback if corrupted
            img = Image.new('RGB', (224, 224), (0,0,0))
            
        if self.transform:
            img = self.transform(img)
            
        return img, target

def create_data_loaders(dataset_path: str, batch_size=32):
    """
    Creates Training, Validation, and Testing DataLoaders with Heavy Data Augmentation.
    Assumes standard ImageFolder format:
    dataset_path/
        weapons/
            Knife/
            Gun/
            ...
        wounds/
            Stab/
            Laceration/
            ...
    Note: For a multi-label output, a custom dataset class might be needed.
    Here we build a robust architecture that can be extended easily.
    """
    print("Initializing Data Transformations & Augmentations...")
    # Robust data augmentation for training
    train_transform = transforms.Compose([
        transforms.RandomResizedCrop(224, scale=(0.8, 1.0)),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.RandomRotation(degrees=15),
        transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.2, hue=0.1),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])

    # Clean transforms for validation/testing
    eval_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])

    # Check if dataset exists
    if not os.path.exists(dataset_path):
        print(f"Dataset path {dataset_path} not found. A valid ImageFolder layout is required.")
        return None, None, None

    # Load robust dataset wrapping preprocess_image_cv2
    try:
        full_dataset = CustomForensicDataset(root_dir=dataset_path, transform=train_transform)
    except Exception as e:
        print(f"Could not load dataset: {e}")
        return None, None, None

    # Split: 70% Train, 15% Val, 15% Test
    dataset_size = len(full_dataset)
    train_size = int(0.7 * dataset_size)
    val_size = int(0.15 * dataset_size)
    test_size = dataset_size - train_size - val_size

    train_dataset, val_dataset, test_dataset = random_split(
        full_dataset, [train_size, val_size, test_size], generator=torch.Generator().manual_seed(42)
    )

    # Apply non-augmented transforms to Validation and Test sets
    val_dataset.dataset = copy.deepcopy(full_dataset)
    test_dataset.dataset = copy.deepcopy(full_dataset)
    val_dataset.dataset.transform = eval_transform
    test_dataset.dataset.transform = eval_transform

    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True, num_workers=0)
    val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False, num_workers=0)
    test_loader = DataLoader(test_dataset, batch_size=batch_size, shuffle=False, num_workers=0)

    return train_loader, val_loader, test_loader

def calculate_metrics(preds, targets):
    """ Calculate basic accuracy. Extendable to Precision, Recall, F1 via sklearn """
    _, predicted = torch.max(preds, 1)
    correct = (predicted == targets).sum().item()
    return correct, len(targets)

def train_model(data_dir: str, epochs=50, batch_size=32, lr=1e-4):
    print(f"Setting up training environment on Device: {device}")
    
    # Instantiate
    model = EnsembleModel().to(device)
    
    # Multi-head loss
    criterion_weapon = nn.CrossEntropyLoss()
    criterion_wound = nn.CrossEntropyLoss()
    
    # Optimizer (AdamW is excellent for Transfer Learning)
    optimizer = optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-4)
    
    # Learning Rate Scheduler
    scheduler = optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode='max', factor=0.1, patience=3, verbose=True)

    loaders = create_data_loaders(data_dir, batch_size)
    if loaders[0] is None:
        print("Training aborted. Cannot create dataloaders.")
        return

    train_loader, val_loader, test_loader = loaders

    best_val_acc = 0.0
    best_model_wts = copy.deepcopy(model.state_dict())
    
    # Early Stopping tracking
    patience = 7
    epochs_no_improve = 0

    print("Beginning Training Loop...")
    for epoch in range(epochs):
        print(f"\nEpoch {epoch+1}/{epochs}")
        print("-" * 20)
        
        # Training Phase
        model.train()
        running_loss = 0.0
        correct_weapons = 0
        total_samples = 0
        
        pbar = tqdm(train_loader, desc="Training")
        for inputs, labels in pbar:
            inputs = inputs.to(device)
            # Assuming labels are tuples of (weapon_class, wound_class) for a custom dataset
            # We will use the generic labels from ImageFolder as a fallback for weapons
            labels = labels.to(device)
            
            optimizer.zero_grad()
            
            # Forward
            weapon_preds, wound_preds = model(inputs)
            
            # Calculate Loss (Example focuses heavily on Weapons, assumes labels=weapon_class)
            loss_w = criterion_weapon(weapon_preds, labels)
            # In a real dual-label scenario, you would have wound_labels and calculate loss_wound = criterion_wound(wound_preds, wound_labels)
            # loss = loss_w + loss_wound
            loss = loss_w
            
            # Backward
            loss.backward()
            optimizer.step()
            
            running_loss += loss.item() * inputs.size(0)
            
            # Metrics
            c, t = calculate_metrics(weapon_preds, labels)
            correct_weapons += c
            total_samples += t
            
            pbar.set_postfix({'Loss': f"{loss.item():.4f}"})

        epoch_loss = running_loss / total_samples
        epoch_acc = correct_weapons / total_samples
        print(f"Train Loss: {epoch_loss:.4f} Acc: {epoch_acc:.4f}")
        
        # Validation Phase
        model.eval()
        val_loss = 0.0
        val_correct = 0
        val_total = 0
        
        with torch.no_grad():
            for inputs, labels in val_loader:
                inputs = inputs.to(device)
                labels = labels.to(device)
                
                weapon_preds, wound_preds = model(inputs)
                loss_w = criterion_weapon(weapon_preds, labels)
                
                val_loss += loss_w.item() * inputs.size(0)
                c, t = calculate_metrics(weapon_preds, labels)
                val_correct += c
                val_total += t

        epoch_val_loss = val_loss / val_total
        epoch_val_acc = val_correct / val_total
        print(f"Val Loss: {epoch_val_loss:.4f} Acc: {epoch_val_acc:.4f}")

        # Learning Rate Scheduling step based on metric
        scheduler.step(epoch_val_acc)

        # Early Stopping & Best Weights Logging
        if epoch_val_acc > best_val_acc:
            print(f"Validation Accuracy improved from {best_val_acc:.4f} to {epoch_val_acc:.4f}. Saving specific checkpoint.")
            best_val_acc = epoch_val_acc
            best_model_wts = copy.deepcopy(model.state_dict())
            epochs_no_improve = 0
            torch.save(model.state_dict(), 'best_forensic_model.pth')
        else:
            epochs_no_improve += 1
            print(f"No improvement for {epochs_no_improve} epochs.")
            if epochs_no_improve >= patience:
                print("Early Stopping Triggered!")
                break

    print("Training Complete. Loading best model weights.")
    model.load_state_dict(best_model_wts)
    print(f"Best Validation Accuracy achieved: {best_val_acc:.4f}")

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Forensic Weapon Architecture Model Trainer")
    parser.add_argument('--dataset', type=str, default='dataset', help='Path to dataset directory')
    parser.add_argument('--epochs', type=int, default=50, help='Max Number of Epochs')
    parser.add_argument('--batch_size', type=int, default=32, help='Batch Size')
    parser.add_argument('--lr', type=float, default=1e-4, help='Learning Rate')
    
    args = parser.parse_args()
    
    print("=== Deep Learning Enhancements Pipeline ===")
    print(f"Config: Epochs={args.epochs}, Batch={args.batch_size}, LR={args.lr}")
    train_model(args.dataset, args.epochs, args.batch_size, args.lr)
