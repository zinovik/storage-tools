package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"strings"
)

type File struct {
	Path        string
	Filename    string
	Thumbnail   string
	Description string
	Text        interface{}
}

type Album struct {
	Title string
	Path  string
	Text  interface{}
}

func main() {
	filesFile, _ := ioutil.ReadFile("files.json")
	fileUrlsFile, _ := ioutil.ReadFile("file-urls.json")
	albumsFile, _ := ioutil.ReadFile("albums.json")

	var files []File
	var fileUrls []string
	var albums []Album

	json.Unmarshal(filesFile, &files)
	json.Unmarshal(fileUrlsFile, &fileUrls)
	json.Unmarshal(albumsFile, &albums)

	for _, file := range files {
		var isMissingFileUrl = true
		for _, fileUrl := range fileUrls {
			if strings.Contains(fileUrl, file.Filename) {
				isMissingFileUrl = false
			}
		}
		if isMissingFileUrl {
			fmt.Println("ERROR: Missing file url for the file: ", file.Filename)
		}

		var isMissingAlbum = true
		for _, album := range albums {
			if album.Path == file.Path {
				isMissingAlbum = false
			}
		}
		if isMissingAlbum {
			fmt.Println("ERROR: Missing album for the file path: ", file.Path)
		}

		if file.Description == "" {
			fmt.Printf("WARNING: Missing file description for the file: %s (%s)\n", file.Filename, file.Path)
		}
	}

	for _, fileUrl := range fileUrls {
		var isMissingFileForUrl = true
		for _, file := range files {
			if strings.Contains(fileUrl, file.Filename) {
				isMissingFileForUrl = false
			}
		}
		if isMissingFileForUrl {
			fmt.Println("ERROR: Missing file for the url: ", fileUrl)
		}
	}

	for _, album := range albums {
		var isMissingFileForAlbum = true
		for _, file := range files {
			if file.Path == album.Path {
				isMissingFileForAlbum = false
			}
		}
		if isMissingFileForAlbum && album.Text == nil {
			fmt.Println("WARNING: Missing files and text for the album: ", album.Path)
		}
	}
}
