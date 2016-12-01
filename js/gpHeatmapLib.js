var gpVisual = {};

gpVisual.HeatMap = function(options) {
    var datasetUrl = options.dataUrl;
    var hContainer = options.container;
    var gpHeatmap = null;
    var colors = null;
    var colorScheme = null;
    var isDiscrete = false;
    var defaultRowZoomLevel = null;
    var defaultColZoomLevel = null;
    var currentRowSortOrder = null;
    var currentColumnSortOrder = null;

    this.COLOR_SCHEME = {
        RELATIVE : 0,
        GLOBAL : 1
    };
    var self = this;

    this._setUp = function(options)
    {
        var bodyWidth = hContainer.width();
        var bodyHeight = hContainer.height();

        gpHeatmap.controls.legend = false;

        if(options !== undefined && options !== null && options.showLegend !== undefined)
        {
            gpHeatmap.controls.legend = options.showLegend;
        }

        if(options !== undefined && options !== null && options.showLegend !== undefined)
        {
            gpHeatmap.controls.rowAnnotations = options.showRowAnnotations;
        }

        gpHeatmap.controls.shortcuts = false;
        gpHeatmap.controls.cellSelector = false;

        if(options !== undefined && options.controls !== undefined)
        {
            if( options.controls.columnSelector !== undefined)
            {
                gpHeatmap.controls.columnSelector = options.controls.columnSelector;
            }

            if(options.controls.rowSelector !== undefined)
            {
                gpHeatmap.controls.rowSelector = options.controls.rowSelector;
            }
        }

        //height of the column labels
        gpHeatmap.cols.labelSize = 150;

        gpHeatmap.size.width = bodyWidth - 265; //- 300; //1100;

        if(options.width !== undefined && !isNaN(options.width))
        {
            gpHeatmap.size.width = options.width;
        }

        //gpHeatmap.size.height = bodyHeight - 230;
        if(options.height !== undefined && !isNaN(options.height))
        {
            gpHeatmap.size.height = options.height;
        }

        //heatmap.cols.labelSize = 330;

        self.setRelativeColorScheme(false);
    };

    this.setOptions = function(options)
    {
        this._setUp(options);
    };

    this._init = function (options)
    {
        hContainer.empty();
        $("#gpHeatMap_imageRenderCanvas").remove();
        hContainer.before($("<canvas/>").attr("id", "gpHeatMap_imageRenderCanvas"));
        $("#gpHeatMap_imageRenderCanvas").hide();
        hContainer.heatmap(
        {
            data:
            {
                values: new jheatmap.readers.GctHeatmapReader(
                {
                    url: datasetUrl,
                    handleError: options.onLoadData
                })
            },
            init: function (heatmap)
            {
                gpHeatmap = heatmap;
                currentRowSortOrder = gpHeatmap.rows.order;
                currentColumnSortOrder = gpHeatmap.cols.order;

                //cols and rows zoom level should be the same
                self.defaultRowZoomLevel = gpHeatmap.rows.zoom;
                self.defaultColZoomLevel = gpHeatmap.cols.zoom;

                self._setUp(options);

                if(options.onLoadData !== undefined && typeof options.onLoadData === 'function')
                {
                    options.onLoadData({
                        success: true
                    });
                }
            }
        });
    };

    self._init(options);

    /*
     * Returns the index of the feature with matching text in the heatmap
     */
    this.findPreviousFeature = function(text, startingIndex, caseSensitive)
    {
        return self._findPrevious(text, startingIndex, "feature", caseSensitive);
    };

    /*
     * Returns the index of the feature with matching text in the heatmap
     */
    this.findPreviousSample = function(text, startingIndex, caseSensitive)
    {
        return self._findPrevious(text, startingIndex, "sample", caseSensitive);
    };

    /*
     * Returns the index of the next matching feature or sample in the heatmap
     */
    this._findPrevious = function(searchText, startingIndex, type, caseSensitive)
    {
        startingIndex = startingIndex === undefined ? data.length: startingIndex;

        //default to searching features if type is not specified
        var data = gpHeatmap.rows.values;
        var dimension = gpHeatmap.rows;
        if(type === "sample")
        {
            data =  gpHeatmap.cols.values;
            dimension = gpHeatmap.cols;
        }

        for(var s = startingIndex;s >= 0;s--)
        {
            var isHidden = dimension.order.indexOf(s) === -1;

            if(isHidden)
            {
                continue;
            }
            //data[][0] contains the feature or column names
            var value = data[s][0];
            if(caseSensitive !== undefined && !caseSensitive)
            {
                 searchText = searchText.toLowerCase();
                value = value.toLowerCase();
            }

            if(value.indexOf(searchText) != -1)
            {
                if(!isHidden)
                {
                    if (type === "sample") {
                        self._scrollToColumn(s, 10);
                    }
                    else {
                        self._scrollToRow(s, 10);
                    }
                }
                else
                {
                    self._unSelectAll(type);
                }
                return {
                    matchIndex: s,
                    match: data[s][0],
                    isHidden: isHidden
                };
            }
        }

        self._unSelectAll(type);
        return {
            matchIndex: -1
        };
    };

    /*
     * Returns the index of the feature with matching text in the heatmap
     */
    this.findNextFeature = function(text, startingIndex, caseSensitive)
    {
        return self._findNext(text, startingIndex, "feature", caseSensitive);
    };

    /*
     * Returns the index of the feature with matching text in the heatmap
     */
    this.findNextSample = function(text, startingIndex, caseSensitive)
    {
        return self._findNext(text, startingIndex, "sample", caseSensitive);
    };

    /*
     * Returns the index of the next matching feature or sample in the heatmap
     */
    this._findNext = function(searchText, startingIndex, type, caseSensitive)
    {
        startingIndex = startingIndex === undefined ? 0: startingIndex;

        //default to searching features if type is not specified
        var data = gpHeatmap.rows.values;
        var dimension = gpHeatmap.rows;
        if(type === "sample")
        {
            data =  gpHeatmap.cols.values;
            dimension = gpHeatmap.cols;
        }

        for(var s = startingIndex;s < data.length;s++)
        {
            var isHidden = dimension.order.indexOf(s) === -1;

            var value = data[s][0];
            if(caseSensitive !== undefined && !caseSensitive)
            {
                searchText = searchText.toLowerCase();
                value = value.toLowerCase();
            }

            if(value.indexOf(searchText) != -1)
            {
                if(!isHidden)
                {
                    if(type === "sample")
                    {
                        self._scrollToColumn(s, 10);
                    }
                    else
                    {
                        self._scrollToRow(s, 10);
                    }
                }
                else
                {
                    self._unSelectAll(type);
                }
                return {
                    matchIndex: s,
                    match: data[s][0],
                    isHidden: isHidden
                };
            }
        }

        self._unSelectAll(type);

        return  {
            matchIndex: -1
        };
    };

    this._scrollToRow  = function(rowIndex, offSet)
    {
        if(rowIndex === undefined || rowIndex < 0 || rowIndex >= gpHeatmap.rows.length)
        {
            return;
        }

        if(offSet === undefined || offSet < 0)
        {
            offSet = 0;
        }

        gpHeatmap.rows.selected = [rowIndex];

        var scrollRow = (rowIndex - offSet) < 0 ? 0 : (rowIndex - offSet);
        gpHeatmap.offset.top = scrollRow;

        var hRes = new jheatmap.HeatmapDrawer(gpHeatmap);
        hRes.build();
        hRes.paint(null, true, true);
    };

    this._unSelectAll = function(type)
    {
        if(type === "sample")
        {
            gpHeatmap.cols.selected = [];
        }
        else
        {
            gpHeatmap.rows.selected = []
        }

        self.drawHeatMap();
    };

    this._scrollToColumn  = function(colIndex, offSet)
    {
        if(colIndex === undefined || colIndex < 0 || colIndex >= gpHeatmap.cols.length)
        {
            return;
        }

        if(offSet === undefined || offSet < 0)
        {
            offSet = 0;
        }

        gpHeatmap.cols.selected = [colIndex];

        var scrollColumn = (colIndex - offSet) < 0 ? 0 : (colIndex - offSet);
        gpHeatmap.offset.left = scrollColumn;

        var hRes = new jheatmap.HeatmapDrawer(gpHeatmap);
        hRes.build();
        hRes.paint(null, true, true);
    };

    this.getRowNames = function()
    {
        var rowNames = [];
        var rows = gpHeatmap.rows.values;

        for(var r=0;r<gpHeatmap.rows.values.length;r++)
        {
            if(rows[r] !== undefined && rows[r].length > 1)
            {
                rowNames.push(rows[r][0]);
            }
        }

        return rowNames;
    };

    this.getFeatureIndexFromGCTReader = function(featureName)
    {
        if(gpHeatmap.rows !== undefined && gpHeatmap.rows.valueIndexMap !== undefined)
        {
            return gpHeatmap.rows.valueIndexMap[featureName];
        }

        return -1;
    };

    this.getFeatureLabels = function()
    {
        return  gpHeatmap.rows.header.length > 1 ? gpHeatmap.rows.header.slice(2) : [];
    };

    this.updateFeatureLabel = function(label, rowLabelDetails)
    {
        var rowHeaders = gpHeatmap.rows.header.length > 1 ? gpHeatmap.rows.header : [];

        //find the index of the label
        var index = $.inArray(label, rowHeaders);
        if(index !== -1)
        {
            if(gpHeatmap.rows.decorators !== undefined && index < gpHeatmap.rows.decorators.length)
            {
                var details = gpHeatmap.rows.decorators[index].colors;

                var rowLabelKeys = Object.keys(rowLabelDetails);
                for(var i=0;i<rowLabelKeys.length;i++)
                {
                    details[rowLabelKeys[i]] = rowLabelDetails[rowLabelKeys[i]];
                }

                self.drawHeatMap();
            }
        }
    };

    this.getFeatureLabelDetails = function(label)
    {
        var rowHeaders = gpHeatmap.rows.header.length > 1 ? gpHeatmap.rows.header : [];

        var details = {};
        //find the index of the label
        var index = $.inArray(label, rowHeaders);
        if(index != -1)
        {
            if(gpHeatmap.rows.decorators !== undefined && index < gpHeatmap.rows.decorators.length)
            {
                details = gpHeatmap.rows.decorators[index].colors;
            }
        }

        return details;
    };

    this.showRowAnnotations = function(annName)
    {
        if(gpHeatmap.rows.annotations.hidden !== undefined)
        {
            var index = $.inArray(annName, gpHeatmap.rows.annotations.hidden);

            if(index !== -1)
            {
                gpHeatmap.rows.annotations.hidden.splice(index, 1);
            }
        }
    };

    this.hideRowAnnotations = function(annName)
    {
        if(gpHeatmap.rows.annotations.hidden === undefined)
        {
            gpHeatmap.rows.annotations.hidden = [];
        }

        if($.inArray(annName, gpHeatmap.rows.annotations.hidden) === -1)
        {
            gpHeatmap.rows.annotations.hidden.push(annName);
        }
    };

    this.hideRowHeader = function(rowName)
    {
        if(gpHeatmap.rows.header.hidden === undefined)
        {
            gpHeatmap.rows.header.hidden = [];
        }

        if($.inArray(rowName, gpHeatmap.rows.header.hidden) === -1)
        {
            gpHeatmap.rows.header.hidden.push(rowName);
        }
    };

    this._addFeatureLabelsFromArr = function(labelsArr, hidden, callback)
    {
        var self = this;
        //array must have at least a label name and one label value
        if(labelsArr == undefined && labelsArr !== null && labelsArr.length < 2)
        {
            if(callback !== undefined && typeof callback === 'function')
            {
                callback({
                    error: 'No label name or label value found'
                });
            }
            return;
        }

        //the first item in the list should be the name of the label
        var labelName = labelsArr[0];

        //check if this is not a duplicate label
        if($.inArray(labelName, gpHeatmap.rows.header) !== -1)
        {
            return;
        }

        var rows = gpHeatmap.rows;

        for(var v=1; v < labelsArr.length;v++)
        {
            if(rows.values[v-1] === undefined)
            {
                rows.values[v-1] = [];
            }

            rows.values[v-1].push(labelsArr[v]);
        }

        var labelIndex = gpHeatmap.rows.header.length;
        gpHeatmap.rows.header.push(labelName);
        gpHeatmap.rows.decorators[labelIndex] = new jheatmap.decorators.CategoricalRandom();
        gpHeatmap.rows.annotations.push(labelIndex);

        if(hidden !== undefined && hidden)
        {
            self.hideRowAnnotations(labelIndex);
            self.hideRowHeader(labelName);
        }

        var hRes = new jheatmap.HeatmapDrawer(gpHeatmap);
        hRes.build();
        hRes.paint(null, true, true);
    };

    this._addFeatureLabelsFromUrl = function(featureLabelsUrl, callback)
    {
        var currentFeatureLabels = gpHeatmap.rows.header.slice();

        //add class labels
        var featureLabelsAdded = function()
        {
            for(var l=0;l<gpHeatmap.rows.header.length;l++)
            {
                var label = gpHeatmap.rows.header[l];
                var existingLabel = $.inArray(label, currentFeatureLabels);

                //check if this is a new label
                if(existingLabel === -1)
                {
                    var labelIndex = $.inArray(label, gpHeatmap.rows.header);

                    if (gpHeatmap.rows.annotations === undefined) {
                        gpHeatmap.rows.annotations = [];
                    }

                    gpHeatmap.rows.decorators[labelIndex] = new jheatmap.decorators.CategoricalRandom();
                    gpHeatmap.rows.annotations.push(labelIndex);
                }
            }
            var hRes = new jheatmap.HeatmapDrawer(gpHeatmap);
            hRes.build();
            hRes.paint(null, true, true);
        };

        var addFLabels = new jheatmap.readers.FeatureLabelsReader(
            {
                url: featureLabelsUrl,
                handleError: callback
            });

        addFLabels.read(gpHeatmap.rows, featureLabelsAdded);
    };

   /* this.modifyRowSortOrder = function(sortOrderList)
    {
        var rows = gpHeatmap.rows.values;
        var rowOrder = gpHeatmap.rows.order;
        for(var r=0;r<rows.length;r++)
        {
            if(rows[r] !== undefined && rows[r].length > 1)
            {
                var rowName = rows[r][0];

                var index = $.inArray(rowName, sortOrderList);
                rowOrder[r]  = index;
            }
        }

        row.order = gpHeatmap.rows.order;
        for(var s=0;s<sortOrderList.length;s++)
        {
            if(sortOrderList[s])
            {

            }
        }
    };*/

    this.sortByFeatureLabel = function(labelName)
    {
        var labelIndex = $.inArray(labelName, gpHeatmap.rows.header);
        gpHeatmap.rows.sorter = new jheatmap.sorters.AnnotationSorter(labelIndex, false);
        gpHeatmap.rows.sorter.sort(gpHeatmap, "rows");

        currentRowSortOrder = gpHeatmap.rows.order;

        self.drawHeatMap();
    };

    this.addFeatureLabels = function(featureLabelsUrl, labelsArr, hidden, callback)
    {
        if(featureLabelsUrl !== undefined && featureLabelsUrl !== null)
        {
            this._addFeatureLabelsFromUrl(featureLabelsUrl, hidden, callback);
        }

        if(labelsArr !== undefined && labelsArr !== null)
        {
            this._addFeatureLabelsFromArr(labelsArr, hidden, callback);
        }
    };

    this.removeFeatureLabels = function(label)
    {
        var labelIndex = $.inArray(label, gpHeatmap.rows.header);
        if(labelIndex !== -1)
        {
            gpHeatmap.rows.decorators.splice(labelIndex, 1);
            gpHeatmap.rows.header.splice(labelIndex, 1);

            var annIndex = $.inArray(labelIndex, gpHeatmap.rows.annotations);

            //now subtract 1 from the annotations if this is not the last item in the list
            if(annIndex !== gpHeatmap.rows.annotations.length - 1)
            {
                for(var a=0; a<gpHeatmap.rows.annotations.length; a++)
                {
                    var num = parseInt(gpHeatmap.rows.annotations[a]);
                    if(!isNaN(num))
                    {
                        gpHeatmap.rows.annotations[a] = num - 1;
                    }
                }
            }
            gpHeatmap.rows.annotations.splice(annIndex, 1);

            //remove the values as well
            for(var v=0; v < gpHeatmap.rows.values.length; v++)
            {
                gpHeatmap.rows.values[v].splice(labelIndex, 1);
            }
            var hRes = new jheatmap.HeatmapDrawer(gpHeatmap);
            hRes.build();
            hRes.paint(null, true, true);
        }
    };

    this.getSampleLabels = function()
    {
        return  gpHeatmap.cols.header.length > 1 ? gpHeatmap.cols.header.slice(1) : [];
    };

    this.updateSampleLabel = function(label, sampleLabelDetails)
    {
        var colHeaders = gpHeatmap.cols.header.length > 1 ? gpHeatmap.cols.header : [];

        //find the index of the label
        var index = $.inArray(label, colHeaders);
        if(index != -1)
        {
            if(gpHeatmap.cols.decorators !== undefined && index < gpHeatmap.cols.decorators.length)
            {
                var details = gpHeatmap.cols.decorators[index].colors;

                var sampleLabelKeys = Object.keys(sampleLabelDetails);
                for(var i=0;i<sampleLabelKeys.length;i++)
                {
                    details[sampleLabelKeys[i]] = sampleLabelDetails[sampleLabelKeys[i]];
                }

                self.drawHeatMap();
            }
        }
    };

    this.getSampleLabelDetails = function(label)
    {
        var colHeaders = gpHeatmap.cols.header.length > 1 ? gpHeatmap.cols.header : [];

        var details = {};
        //find the index of the label
        var index = $.inArray(label, colHeaders);
        if(index != -1)
        {
            if(gpHeatmap.cols.decorators !== undefined && index < gpHeatmap.cols.decorators.length)
            {
                details = gpHeatmap.cols.decorators[index].colors;
            }
        }

        return details;
    };

    this.drawHeatMap = function(options)
    {
        if(options === undefined || options === null)
        {
            options = {};
        }

        if(options.showScrollBars === undefined)
        {
            options.showScrollBars = true;
        }

        self._setUp(options);

        if(options.reloadData)
        {
            self._init(options);
        }
        else
        {
            //just rebuild the heatmap
            var hRes = new jheatmap.HeatmapDrawer(gpHeatmap);
            hRes.build();
            hRes.paint(null, !options.showScrollBars);
        }
    };

    this.addSampleLabels = function(clsUrl, label, callback)
    {
        //add class labels
        var clsAdded = function()
        {
            var labelIndex = $.inArray(label, gpHeatmap.cols.header);

            if(gpHeatmap.cols.annotations === undefined)
            {
                gpHeatmap.cols.annotations = [];
            }

            gpHeatmap.cols.decorators[labelIndex] = new jheatmap.decorators.CategoricalRandom();
            gpHeatmap.cols.annotations.push(labelIndex);

            self.drawHeatMap();
        };

        var addCls = new jheatmap.readers.ClsReader(
        {
            url: clsUrl,
            label: label,
            handleError: callback
        });

        addCls.read(gpHeatmap.cols, clsAdded);
    };

    this.removeSampleLabels = function(label)
    {
        var labelIndex = $.inArray(label, gpHeatmap.cols.header);
        if(labelIndex !== -1)
        {
            gpHeatmap.cols.decorators.splice(labelIndex, 1);
            gpHeatmap.cols.header.splice(labelIndex, 1);

            var annIndex = $.inArray(labelIndex, gpHeatmap.cols.annotations);

            //now subtract 1 from the annotations if this is not the last item in the list
            if(annIndex !== gpHeatmap.cols.annotations.length - 1)
            {
                for(var a=0; a<gpHeatmap.cols.annotations.length; a++)
                {
                    var num = parseInt(gpHeatmap.cols.annotations[a]);
                    if(!isNaN(num))
                    {
                        gpHeatmap.cols.annotations[a] = num - 1;
                    }
                }
            }
            gpHeatmap.cols.annotations.splice(annIndex, 1);

            //remove the values as well
            for(var v=0; v < gpHeatmap.cols.values.length; v++)
            {
                gpHeatmap.cols.values[v].splice(labelIndex, 1);
            }
            var hRes = new jheatmap.HeatmapDrawer(gpHeatmap);
            hRes.build();
            hRes.paint(null, true, true);
        }
    };

    this.getDefaultRowZoomLevel = function()
    {
        return self.defaultRowZoomLevel;
    };

    this.getDefaultColZoomLevel = function()
    {
        return self.defaultColZoomLevel;
    };

    this.getZoomLevel = function()
    {
        return gpHeatmap.rows.zoom;
    };

    this.setColors = function(colors)
    {
        self.colors = colors;
    };

    this.getColors = function()
    {
        if(self.colors === undefined || self.colors === null)
        {
            self.colors = [[0, 0, 255], [255,255,255], [255,0,0]];
        }

        return self.colors;
    };

    this.setGlobalColorScheme = function(isDiscrete)
    {
        self.colorScheme = self.COLOR_SCHEME.GLOBAL;
        self.isDiscrete = isDiscrete;


        if(!isDiscrete)
        {
            var minColor = [0, 0, 255];
            var midColor = [255,255,255];
            var maxColor = [255,0,0];

            if(self.colors !== undefined && self.colors !== null && self.colors.length > 0)
            {
                minColor = self.colors[0];
                if(self.colors.length > 1)
                {
                    midColor = self.colors[1];
                }

                if(self.colors.length > 2)
                {
                    maxColor = self.colors[2];
                }
            }

            gpHeatmap.cells.decorators[0] = new jheatmap.decorators.Heat(
                {
                    minValue: gpHeatmap.cells.minValue,
                    midValue: gpHeatmap.cells.meanValue,
                    maxValue: gpHeatmap.cells.maxValue,
                    minColor: minColor,
                    midColor: midColor,
                    maxColor: maxColor
                });
        }
        else
        {
            gpHeatmap.cells.decorators[0] = new jheatmap.decorators.DiscreteColor(
                {
                    colors: self.colors,
                    relative: false,
                    minValue: gpHeatmap.cells.minValue,
                    meanValue: gpHeatmap.cells.meanValue,
                    maxValue: gpHeatmap.cells.maxValue
                });
        }
    };

    this.setRelativeColorScheme = function(isDiscrete)
    {
        self.colorScheme = this.COLOR_SCHEME.RELATIVE;
        self.isDiscrete = isDiscrete;

        if(!isDiscrete)
        {
            var rColors = [];

            var minColor = [0, 0, 255];
            var midColor = [255, 255, 255];
            var maxColor = [255, 0, 0];

            if (self.colors !== undefined && self.colors !== null && self.colors.length > 0)
            {
                minColor = self.colors[0];
                if (self.colors.length > 1) {
                    midColor = self.colors[1];
                }

                if (self.colors.length > 2) {
                    maxColor = self.colors[2];
                }
            }

            var firstColorRange = [];
            firstColorRange.push(minColor, midColor);

            var lastColorRange = [];
            lastColorRange.push(midColor, maxColor);
            rColors = [firstColorRange, lastColorRange];

            gpHeatmap.cells.decorators[0] = new jheatmap.decorators.RowLinear(
                {
                    colors: rColors
                });
        }
        else
        {
            gpHeatmap.cells.decorators[0] = new jheatmap.decorators.DiscreteColor(
                {
                    colors: self.colors,
                    relative: true
                });
        }
    };

    this.getColorScheme = function()
    {
        return this.colorScheme;
    };

    this.isLegendVisible = function()
    {
        return gpHeatmap.controls.legend;
    }

    this.updateColorScheme = function (colorScheme, isDiscrete, options)
    {
        if(colorScheme === this.COLOR_SCHEME.GLOBAL)
        {
            this.setGlobalColorScheme(isDiscrete);
        }
        else
        {
            this.setRelativeColorScheme(isDiscrete);
        }

        if(options !== undefined && options !== null)
        {
            this._setUp(options);
        }

        var hRes = new jheatmap.HeatmapDrawer(gpHeatmap);
        hRes.build();
        hRes.paint(null, true, true);
    };

    this.zoom = function (zoomLevel)
    {
        gpHeatmap.rows.zoom = zoomLevel;
        gpHeatmap.cols.zoom = zoomLevel;


        var hRes = new jheatmap.HeatmapDrawer(gpHeatmap);
        hRes.build();
        hRes.paint(null, false);
    };

    this.saveImage = function (fileName, fileFormat, allFeatures)
    {
        var originalWidth = gpHeatmap.size.width;
        var originalHeight = gpHeatmap.size.height;

        var imageWidth = gpHeatmap.size.width;
        var imageHeight = gpHeatmap.size.height;

        if(allFeatures) {
            imageHeight = gpHeatmap.rows.values.length * gpHeatmap.rows.zoom + 100;
            imageWidth = gpHeatmap.cols.values.length * gpHeatmap.cols.zoom;
        }
        //gpHeatmap.size.height = 12 * ;//30000;
        gpHeatmap.size.height = imageHeight;

        if (fileFormat === "png") {
            //limit on size of heatmap if saving as PNG
            if (imageHeight * imageWidth > 43000000) {
                alert("Image is too large to save as png. Please save as SVG instead.");
                //throw new Error("Image is too large to save as png. Please save as SVG instead.");

                gpHeatmap.size.height = originalHeight;
                return false;
            }

            //the default is to save as svg
            //gpHeatmap.size.height = 12 * ;//30000;  // ---> 12 is the default zoom size
            gpHeatmap.size.height = imageHeight; // / 2;
            gpHeatmap.size.width = imageWidth;

            context = new C2S(gpHeatmap.size.width + 300, gpHeatmap.size.height + 350);

            var hRes = new jheatmap.HeatmapDrawer(gpHeatmap);
            hRes.build();
            hRes.paint(context, true);

            var svg = context.getSerializedSvg();

            $("#gpHeatMap_imageRenderCanvas").attr("width", gpHeatmap.size.width + 300);
            $("#gpHeatMap_imageRenderCanvas").attr("height", gpHeatmap.size.height + 350);

            canvg(document.getElementById('gpHeatMap_imageRenderCanvas'), svg);

            //redraw the image
            gpHeatmap.size.height = originalHeight;
            gpHeatmap.size.width = originalWidth;
            hRes = new jheatmap.HeatmapDrawer(gpHeatmap);
            hRes.build();
            hRes.paint(null, false);

            var canvas = document.getElementById('gpHeatMap_imageRenderCanvas');
            canvas.toBlob(function (blob) {
                saveAs(blob, fileName);
            });
        }
        else {
            //the default is to save as svg
            //gpHeatmap.size.height = 12 * ;//30000;  // ---> 12 is the default zoom size
            gpHeatmap.size.height = imageHeight; // / 2;
            gpHeatmap.size.width = imageWidth;

            var context = new C2S(gpHeatmap.size.width + 360, gpHeatmap.size.height + 350);

            var hRes = new jheatmap.HeatmapDrawer(gpHeatmap);
            hRes.build();
            hRes.paint(context, true);

            var svg = context.getSerializedSvg();
            var blob = new Blob([ svg ], {
                type: "text/plain;charset=utf-8"
            });

            var file = fileName.endsWith(".svg") ? fileName : fileName + ".svg";
            saveAs(blob, file);

            gpHeatmap.size.height = originalHeight;
            gpHeatmap.size.width = originalWidth;
            hRes = new jheatmap.HeatmapDrawer(gpHeatmap);
            hRes.build();
            hRes.paint(null, false);
        }

        return true;
    };

    this.showAllFeatures = function()
    {
        var self = this;

        //reset the zoom level to the default
        if(!isNaN(self.getDefaultRowZoomLevel()))
        {
            gpHeatmap.rows.zoom = self.getDefaultRowZoomLevel();
        }

        //reset the zoom level to the default
        if(!isNaN(self.getDefaultColZoomLevel()))
        {
            gpHeatmap.cols.zoom = self.getDefaultColZoomLevel();
        }

        new jheatmap.actions.ShowHidden(gpHeatmap).rows();

        self.drawHeatMap();

        self.zoom(self.getDefaultRowZoomLevel());

    };

    this.filterRowByName = function(rowNames, options)
    {
        var self = this;
        if(rowNames == undefined  || rowNames == null || rowNames.length == 0
            || currentRowSortOrder == undefined || currentRowSortOrder == null)
        {
            return;
        }

        var newOrder = [];
        //only show the rows with the following names
        var rows = gpHeatmap.rows.values;
        for(var r=0;r< currentRowSortOrder.length;r++)
        {
            var rowName = rows[currentRowSortOrder[r]][0];
            if(rows[currentRowSortOrder[r]] !== undefined && rows[currentRowSortOrder[r]].length > 1
                && $.inArray(rowName, rowNames) !== -1)
            {
                newOrder.push(currentRowSortOrder[r]);
            }
        }

        gpHeatmap.rows.order = newOrder;

        self.drawHeatMap(options);
    }
};
