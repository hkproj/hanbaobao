#!/bin/bash

# Run the build script
npm run build

DEST="/mnt/c/Users/ujmnt/OneDrive/Desktop/hanbaobao"

# Check if the destination directory exists, otherwise end with an error
if [ ! -d $DEST ]; then
    echo "Destination directory does not exist"
    exit 1
fi

echo "Deploying to $DEST. This will delete everything in the destination directory. Continue? (y/n)"
read -r RESPONSE

if [[ ! "$RESPONSE" =~ ^([yY][eE][sS]|[yY])+$ ]]; then
    echo "Aborting"
    exit 1
fi

# Delete everything in the destination directory
rm -rf $DEST/*

# Copy to the destination directory
cp -r data $DEST/
cp -r dist $DEST/
cp -r icons $DEST/
cp manifest.json $DEST/