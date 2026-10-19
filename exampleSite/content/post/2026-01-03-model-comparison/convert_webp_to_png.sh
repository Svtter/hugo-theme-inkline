#!/bin/bash
# Convert all .webp files to .png in the current directory

for file in *.webp; do
    if [ -f "$file" ]; then
        filename="${file%.webp}"
        echo "Converting: $file -> ${filename}.png"
        convert "$file" "${filename}.png"
    fi
done

echo "Conversion complete!"
