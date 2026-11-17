#!/bin/sh
# Builds tests/.tailwind.css (Tailwind 3.4.17 + the app's config) so UI tests get real layout offline.
# Rebuild after changing markup in index.html.
cd "$(dirname "$0")" && npx --yes tailwindcss@3.4.17 -c tailwind.config.js -i tailwind-input.css -o .tailwind.css
