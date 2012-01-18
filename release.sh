#!/bin/bash

set -e

version=$1

package=$(basename $(pwd))
output_dir=~/tmp/$package-$version
if [[ ! $version ]]; then
	echo "Needs a version number as argument"
	exit 1
fi

echo "Releasing version ${version}"

echo "Setting version number in manifest.json"
sed -i "s/version\":.*/version\": \"${version}\"/" manifest.json

if [[ $(git diff | grep manifest.json) ]]; then
	echo "Committing changes"
	git add manifest.json
	git commit -m"Releasing version $version"
fi

echo "Tagging locally"
git tag $version

echo "Pushing tag"
git push --tags origin master

echo "Creating directory"
rm -rf $output_dir
mkdir $output_dir

echo "Copy files needed"
cp 128.png $output_dir
cp 48.png $output_dir
cp manifest.json $output_dir
cp rdio-enhancer.js $output_dir
cp rdio-enhancer.css $output_dir


echo "Creating zip file for Chrome webstore upload"
rm -f $output_dir.zip
zip -r $output_dir.zip $output_dir
