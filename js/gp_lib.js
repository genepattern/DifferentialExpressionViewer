var gpLib = function() {

    /**
     * Uploads a file to the GP Files Tab
     * @param url - the url of the file on the GP server
     * @param data - the contents of the file
     * @param callBack - a callback function if the upload was successful
     */
    function uploadDataToFilesTab(url, data, callBack) {
        var uploadData = new Blob(data, {type: 'text/plain'});

        $.ajax({
            type: "POST",
            processData: false,
            contentType: false,
            data: uploadData,
            url: "/gp/rest/v1/upload/whole/?path=" + encodeURIComponent(url),
            success: function () {
                console.log("upload complete");

                if (callBack !== undefined) {
                    callBack("success");
                }
            },
            error: function (data, textStatus) {
                console.log("Error: " + textStatus);
                callBack("Error: " + textStatus)
            }
        });
    }

    /**
     * This function displays a dialog displaying the directories in the Files Tab for the current GP user
     * @param callBack - a callback function if a directory in the Files Tab was selected
     */
    function saveToGPDialog(callBack) {
        //create dialog
        w2popup.open({
            title: 'Select Directory from Files Tab',
            width: 600,
            height: 320,
            showMax: true,
            modal: true,
            body: '<div id="gpDialog"><div id="fileTree" style="height: 300px;"/></div>',
            buttons: '<button class="btn" onclick="w2popup.close();">Cancel</button> <button class="btn" onclick="w2popup.close();">OK</button>',
            onOpen: function (event) {
                event.onComplete = function () {
                    $("#fileTree").gpUploadsTree(
                        {
                            name: "Uploads_Tab_Tree"
                        });
                };
            },
            onClose: function (event) {
                var selectGpDir = $("#fileTree").gpUploadsTree("selectedDir");
                event.onComplete = function () {
                    $("#fileTree").gpUploadsTree("destroy");
                    callBack(selectGpDir);
                }
            }
        });
    }

    /**
     * Parses a gct file into an object
     * @param fileContents = the contents of the file
     */
    function parseGCTFile(fileContents)
    {
        var data = {
            sampleNames: [],
            rowNames: [],
            rowDescriptions: [],
            matrix: [[]]
        };
        var lines = fileContents.split(/\n/);

        if(lines.length >= 4 && lines[0].indexOf("#1.2") != -1)
        {
            //The samples
            var sampleLines = lines[2];
            var samples = sampleLines.split(/\t/);
            samples.splice(0, 2);
            data.sampleNames = samples;

            //the data starts on line 4 for a gct file
            for(var r=3;r<lines.length;r++)
            {
                var rowData = lines[3].split(/\t/);
                data.rowNames.push(rowData[0]);
                data.matrix[r-3] = rowData.slice(2);
            }
        }
        else
        {
            console.log("Error parsing data: Unexpected number of lines " + lines.length);
        }

        return data;
    }

    function parseODF(fileContents, modelType)
    {
        var data = {};

        var lines = fileContents.split(/\n/);

        if(lines.length < 2)
        {
            console.log("Error parsing ODF file. Unexpected number " +
                "of lines: " + lines.length);
            return;
        }

        //get the number of header lines
        var headerLine = lines[1].split('=');

        if(headerLine.length < 2)
        {
            console.log("Error parsing header line : " + lines[1]);
            return;
        }

        var numHeaderLines = parseInt(headerLine[1]);
        data[headerLine[0]] = numHeaderLines;

        for(var r=2;r<numHeaderLines+2; r++)
        {
            var headerRow = lines[r].split("=");

            if(headerRow.length > 1)
            {
                data[headerRow[0]] = headerRow[1];
            }
            else
            {
                //then assume the value is a list instead of a String
                headerRow = lines[r].split(":");

                if(headerRow.length > 1)
                {
                    var list = headerRow[1].split(/\t/);
                    data[headerRow[0]] = list;
                }
            }

        }

        //Now check that this is a CMS ODF file
        if(data["Model"].length === 0 || data["Model"] !== modelType)
        {
            alert("Invalid ODF model. Found " + data["Model"] + " but expected " + modelType);
            return;
        }

        //Now parse the data lines
        if(data["DataLines"].length > 0)
        {
            var numDataRows = parseInt(data["DataLines"]);

            var startRow = numHeaderLines + 2;
            for(var n=startRow; n < numDataRows + startRow; n++)
            {
                var dataRow = lines[n].split(/\t/);

                var numColumns = dataRow.length;

                if(numColumns !== data["COLUMN_NAMES"].length)
                {
                    alert("Unexpected number of data columns found. Expected "
                    +   dataRow.length + " but found " +data["COLUMN_NAMES"].length);
                    return;
                }

                if(numColumns !== data["COLUMN_TYPES"].length)
                {
                    alert("Unexpected number of data column types found. Expected "
                        +  numColumns + " but found " + data["COLUMN_TYPES"].length);
                    return;
                }

                for(var c=0;c < numColumns; c++)
                {
                    var columnName = data["COLUMN_NAMES"][c];

                    var columnData = data[columnName];

                    if(columnData === undefined)
                    {
                        columnData = [];
                    }

                    var dataValue = dataRow[c];
                    if(data["COLUMN_TYPES"][c] === "int")
                    {
                        dataValue = parseInt(dataValue);
                    }

                    if(data["COLUMN_TYPES"][c] === "double")
                    {
                        dataValue = parseFloat(dataValue);
                    }

                    columnData.push(dataValue);
                    data[columnName] = columnData;
                }
            }
        }

        return data;
    }

    /**
     * Retrieves the contents of a file from a URL
     * @param fileURL
     * @param callBack
     */
    function getDataAtUrl(fileURL, callBack)
    {
        $.ajax({
            contentType: 'text/plain',
            url: fileURL
        }).done(function (response, status, xhr) {
            callBack(response);
        }).fail(function (response, status, xhr)
        {
            console.log(response.statusText);
        });
    }

    // declare 'public' functions
    return {
        uploadDataToFilesTab:uploadDataToFilesTab,
        saveToGPDialog: saveToGPDialog,
        getDataAtUrl: getDataAtUrl,
        parseGCTFile: parseGCTFile,
        parseODF: parseODF
    };
}

(function( $ ) {
    $.widget("ui.gpUploadsTree", {
        directory: null,
        options: {
            name: "",
            onSuccess: null,
            nodes: []
        },
        topLevelNodeCounter: 0,
        _create: function() {

            var self = this,
                opt = self.options,
                el = self.element;

            this._createTree();
        },
        _setOption: function (key, value) {},
        _getSubDirs: function(dirUrl, parentId)
        {
            var self = this;

            var servletUrl = "/gp/UploadFileTree/saveTree";
            if(dirUrl != null)
            {
                servletUrl +="?dir=" + encodeURIComponent(dirUrl);
            }

            $.ajax({
                url: servletUrl,
                type: "GET",
                dataType: "json",
                success: function(data) {
                    // Populate the parameter with the sub directories
                    console.log(data);

                    $.each(data, function(index, file)
                    {
                        var isDir = (file.data.attr !== undefined && file.data.attr["data-kind"] == "directory");
                        if (isDir) {
                            //add this directory to the tree
                            var dirName = file.data.attr["name"];
                            var nodeId = null;
                            if (parentId == null) {
                                nodeId = self.topLevelNodeCounter++;

                                if (w2ui[self.options.name].get(nodeId) == null)
                                {
                                    w2ui[self.options.name].add([
                                        { id: nodeId.toString(), text: dirName, icon: 'icon-folder', url: file.data.attr["href"]}
                                    ]);

                                    self._getSubDirs(file.data.attr["href"], nodeId.toString());
                                }
                            }
                            else
                            {
                                nodeId = parentId + "-" + index.toString();
                                if(w2ui[self.options.name].get(nodeId) == null)
                                {
                                    w2ui[self.options.name].insert(parentId, null, [
                                        { id: nodeId, text: dirName, img: 'icon-folder', url: file.data.attr["href"]}
                                    ]);
                                }
                            }
                        }
                    });
                },
                error: function() {
                    console.log("Unable to expand directory.");
                }
            });
        },
        _createTree: function()
        {
            var self = this;

            $(this.element).w2sidebar({
                name: self.options.name,
                nodes: [
                    { id: 'top-level', text: 'Files Tab', expanded: true, group: true,
                        nodes: self.options.nodes
                    }
                ],
                onClick: function(event) {
                    //show sub directories
                    var nodeId = event.target;
                    var dirUrl = w2ui[this.name].get(nodeId).url;
                    self._getSubDirs(dirUrl, nodeId);
                    self.directory = {
                        name: w2ui[this.name].get(nodeId).text,
                        url : dirUrl
                    };
                },
                onExpand: function(event) {
                    console.log(event);
                    //get contents of visible directories
                    var parentNode = event.object;
                    var nodes = parentNode.nodes;
                    if(nodes !== undefined && nodes.length > 0)
                    {
                        for(var i=0;i<nodes.length;i++)
                        {
                            self._getSubDirs(nodes[i].url, nodes[i].id);
                        }
                    }
                }
            });

            self._getSubDirs();
        },
        destroy: function() {
            w2ui[this.options.name].destroy();
        },
        selectedDir: function()
        {
            return this.directory;
        }
    });
}( jQuery ));