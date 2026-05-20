/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class', // Use class-based dark mode
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Light theme colors (default)
                background: "#F9FAFB",      // Light gray background
                card: "#FFFFFF",            // White cards
                secondary: "#F3F4F6",       // Light gray secondary
                text: "#111827",            // Dark text
                muted: "#6B7280",           // Gray muted text
                border: "#E5E7EB",          // Light borders

                // Dark theme colors (with dark: prefix) - STRICT BLACK/GRAY/RED ONLY
                "dark-background": "#0b0f19",    // Background main
                "dark-card": "#111827",          // Cards
                "dark-secondary": "#1f2937",     // Inputs
                "dark-text": "#e5e7eb",          // pure white per requirements
                "dark-muted": "#9CA3AF",         // Gray muted (gray-400)
                "dark-border": "#374151",        // Dark borders (gray-700)

                // Forensic color scheme - NO BLUE, NO PURPLE
                primary: "#991B1B",              // Cherry red (primary actions)
                "primary-hover": "#7F1D1D",      // Darker red hover
                accent: "#DC2626",               // Bright red accent
                "accent-light": "#EF4444",       // Lighter red for highlights

                // Status colors (used sparingly)
                success: "#166534",              // Subtle green (only for verified/active)
                "success-bg": "#DCFCE7",         // Light green background
                "success-dark": "#14532D",       // Dark green
                warning: "#D97706",              // Amber for warnings
                "warning-bg": "#FEF3C7",         // Light amber
                error: "#DC2626",                // Red for errors
                "error-bg": "#FEE2E2",           // Light red

                // Remove blue/indigo/purple from palette
                // Only red, gray, black, white allowed
            },
            keyframes: {
                scan: {
                    '0%, 100%': { transform: 'translateY(-100%)' },
                    '50%': { transform: 'translateY(400%)' },
                }
            },
            animation: {
                scan: 'scan 2s ease-in-out infinite',
            }
        },
    },
    plugins: [],
}
