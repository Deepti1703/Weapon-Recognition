import os
import re

target_dir = r"c:\Users\LENOVO\OneDrive\Desktop\weapon detection using images of wound\frontend\src"

files_to_process = []
for root, _, files in os.walk(target_dir):
    for f in files:
        if f.endswith(".jsx") or f.endswith(".js"):
            files_to_process.append(os.path.join(root, f))

# We will apply a set of tailored REGEX replacements to enforce true dual-mode
for path in files_to_process:
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    
    original_content = content
    
    # 1. Backgrounds & Cards
    # In dashboard and forms: "bg-white dark:bg-slate-800" or just "bg-white"
    # User says: Cards / Panels / Sections: bg-gray-900 border border-gray-700 shadow-md
    # Let's replace "bg-white" unconditionally where it appears as a tailwind class
    # but carefully handle if it already says "dark:bg-slate-..."
    
    # Strip out existing dark:bg-... rules that were used to counteract bg-white
    content = re.sub(r"dark:bg-slate-\d+", "", content)
    content = re.sub(r"dark:bg-gray-\d+", "", content)
    content = re.sub(r"dark:border-slate-\d+", "", content)
    content = re.sub(r"dark:text-slate-\d+", "", content)
    content = re.sub(r"dark:text-gray-\d+", "", content)
    
    # Replace single spaces
    content = re.sub(r" +", " ", content)

    # 1. General Panel Backgrounds
    content = content.replace("bg-white", "bg-white dark:bg-gray-900 dark:border-gray-700")

    # 2. Text colors
    content = content.replace("text-slate-800", "text-slate-800 dark:text-gray-200")
    content = content.replace("text-slate-700", "text-slate-700 dark:text-gray-300")
    content = content.replace("text-gray-800", "text-gray-800 dark:text-gray-200")
    
    # 3. Inputs replacing
    # bg-white border border-slate-300 -> bg-white dark:bg-gray-800 dark:border-gray-600
    content = content.replace("border-slate-300", "border-slate-300 dark:border-gray-600")
    content = content.replace("border-slate-200", "border-slate-200 dark:border-gray-700")
    content = content.replace("focus:border-slate-500", "focus:border-slate-500 dark:focus:border-gray-500")
    
    # Button Blue replacing
    content = content.replace("bg-blue-600", "bg-red-800")
    content = content.replace("hover:bg-blue-700", "hover:bg-red-700")
    content = content.replace("text-blue-600", "text-red-800")
    content = content.replace("text-blue-500", "text-red-700")

    if original_content != content:
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Updated {os.path.basename(path)}")

print("Done")
