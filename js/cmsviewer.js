var APPLICATION_NAME= "ComparativeMarkerSelectionViewer version 8";
var requestParams;
var jobResultNumber;
var dataset;
var cmsOdf;
var datasetFile;
var odfFile;
var odfFileName;
var computedStatsColumnNames;
var cmsOdfContents = "";
var datasetContents = "";
var cmsHeatMap;


function loadDataset(data) {
    dataset = gpLib.parseGCTFile(data);

    data = null;
}

function loadOdfFile(odfURL)
{
    var headers = {};

    if(gpLib.isGenomeSpaceFile(odfURL))
    {
        if(requestParams["|gst"] !== undefined && requestParams["|gsu"] !== undefined) {
            headers = {
                "gs-token": requestParams["|gst"].join(),  //should only be one item
                "gs-username": requestParams["|gsu"].join()
            };
        }
    }

    gpLib.rangeRequestsAllowed(odfURL,
    {
        successCallBack: function(acceptRanges)
        {
            if(acceptRanges)
            {
                clearTimeout();
                setTimeout(blockElement($("body"), "Loading and parsing ODF file...", false), 3000);

                //get the third data row in order to get the sample names
                getOdfFileContentsUsingByteRequests(odfURL, -1, 0, 1000000, headers);
            }
            else
            {
                gpLib.getDataAtUrl(odfURL,
                {
                    headers: headers,
                    successCallBack: displayViewer,
                    failCallBack: displayLoadError
                });
            }
        },
        failCallBack: function()
        {
            gpLib.getDataAtUrl(odfURL,
            {
                headers: headers,
                successCallBack: displayViewer,
                failCallBack: displayLoadError
            });
        }
    });
}

function loadDatasetFile(datasetURL)
{
     var headers = {};
     if(gpLib.isGenomeSpaceFile(datasetFile))
     {
         if(requestParams["|gst"] !== undefined && requestParams["|gsu"] !== undefined) {
         headers = {
             "gs-token": requestParams["|gst"].join(),
             "gs-username": requestParams["|gsu"].join()
             };
         }
     }

    gpLib.rangeRequestsAllowed(datasetURL,
    {
        successCallBack: function(acceptRanges)
        {
            if(acceptRanges)
            {
                clearTimeout();
                setTimeout(blockElement($("body"), "Loading and parsing dataset file...", false), 4000);

                //get the third data row in order to get the sample names
                getDatasetFileContentsUsingByteRequests(datasetURL, -1, 0, 1000000, headers);
            }
            else
            {
                gpLib.getDataAtUrl(datasetFile,
                {
                    headers: headers,
                    successCallBack: loadDataset,
                    failCallBack: function(errorMsg, response) {
                        alert("Failed to load the dataset at " + datasetFile + ": \n" + errorMsg);

                        console.log("Failed to load the dataset at " + datasetFile + ": \n" + errorMsg);
                        $("#saveDataset").addClass("disabled");
                        $("#profile").addClass("disabled");
                    }
                });
            }
        },
        failCallBack: function()
        {
            gpLib.getDataAtUrl(datasetFile,
            {
                headers: headers,
                successCallBack: loadDataset,
                failCallBack: function(errorMsg, response) {
                    alert("Failed to load the dataset at " + datasetFile + ": \n" + errorMsg);

                    console.log("Failed to load the dataset at " + datasetFile + ": \n" + errorMsg);
                    $("#saveDataset").addClass("disabled");
                    $("#profile").addClass("disabled");
                }
            });
        }
    });
}

function blockElement(element, message, showAnimation)
{
    var spinner = '<img src="css/images/spin.gif" />';
    if(showAnimation !== undefined && !showAnimation)
    {
        spinner = "";
    }

    element.block(
    {
        message: '<h2>'+ spinner + message +'</h2>',
        css: {
            padding:            0,
            margin:             0,
            width:              '30%',
            top:                '30%',
            left:               '35%',
            textAlign:          'center',
            color:              '#000',
            border:             '2px solid #aaa',
            "font-size":        '14px',
            "font-weight":      'normal',
            backgroundColor:    '#fff',
            cursor:             'wait'
        },
        centerY: false,
        centerX: false,
        overlayCSS:  {
            backgroundColor: '#000',
            opacity:         0.1,
            cursor:          'wait'
        }
    });
}

function getOdfFileContentsUsingByteRequests(fileURL, maxNumLines, startBytes, byteIncrement, fileContents, headers)
{
    if(fileContents != undefined)
    {
        cmsOdfContents = cmsOdfContents.concat(fileContents);
    }

    if(startBytes != undefined && startBytes != null && startBytes >= 0 && fileContents != "")
    {
        gpLib.readBytesFromURL(fileURL, maxNumLines, startBytes, byteIncrement,
        {
            headers: headers,
            successCallBack: getOdfFileContentsUsingByteRequests,
            failCallBack: displayLoadError
        });

    }
    else
    {
        if(cmsOdfContents != undefined && cmsOdfContents != null && cmsOdfContents.length > 0)
        {
            displayViewer(cmsOdfContents);
            cmsOdfContents = null;
        }
        else
        {
            displayLoadError("data is empty");
        }
    }
}

function getDatasetFileContentsUsingByteRequests(fileURL, maxNumLines, startBytes, byteIncrement, fileContents, headers)
{
    if(fileContents != undefined)
    {
        datasetContents = datasetContents.concat(fileContents);
    }

    var processFailure = function(errorMsg, response) {
        alert("Failed to load the dataset at " + fileURL + ": \n" + errorMsg);

        console.log("Failed to load the dataset at " + fileURL + ": \n" + errorMsg);
        $("#saveDataset").addClass("disabled");
        $("#profile").addClass("disabled");
    };

    if(startBytes != undefined && startBytes != null && startBytes >= 0 && fileContents != "")
    {

        gpLib.readBytesFromURL(fileURL, maxNumLines, startBytes, byteIncrement,
        {
            headers: headers,
            successCallBack: getDatasetFileContentsUsingByteRequests,
            failCallBack: processFailure
        });
    }
    else
    {
        if(datasetContents != undefined && datasetContents != null && datasetContents.length > 0)
        {
            loadDataset(datasetContents);
            datasetContents = null;
        }
        else
        {
            processFailure("Dataset at " + datasetFile+ " is empty");
        }
    }
}

function displayViewer(data) {

    try
    {
        cmsOdf = gpLib.parseODF(data, "Comparative Marker Selection");
    }
    catch(err) {
        $("body").unblock();
        displayLoadError(err);
        return;
    }

    console.log("Finished parsing the odf file " + odfFile);

    //Rename the Score to the name of the Test Statistic
    var testStatisticLabel = cmsOdf["Test Statistic"];
    cmsOdf[testStatisticLabel] = cmsOdf["Score"];
    delete cmsOdf["Score"];

    var columnIndex = $.inArray("Score", cmsOdf.COLUMN_NAMES);
    cmsOdf.COLUMN_NAMES[columnIndex] = testStatisticLabel;

    computedStatsColumnNames = [];
    for (var i = 0; i < cmsOdf["COLUMN_NAMES"].length; i++)
    {
        var columnName = cmsOdf["COLUMN_NAMES"][i];
        if(columnName !== "Description" && columnName !== "Feature")
        {
            computedStatsColumnNames.push(columnName);
        }
    }

    $("#cmsScorePlot").hide();

    initMenu();
    initTable();
    initHeatMap();

    $("body").unblock();
}

function calculateHistogram(numBins, data)
{
    //calculate the histogram
    var histogram = d3.layout.histogram().bins(numBins)(data);

    var hist = [];
    for(var h=0;h<histogram.length;h++)
    {
        hist.push([histogram[h].x, histogram[h].y]);
    }

    return hist;
}

function getDataInColumn(columnName)
{
    var data = [];
    var records = w2ui['cmsTable'].records;
    for(var r=0;r<records.length;r++)
    {
        data.push(records[r][columnName]);
    }

    return data;
}

function clearView()
{
    $("#plot").hide();
    $("#histogramBins").hide();
    $("#cmsScorePlot").hide();
    $("#heatMapMain").hide();
}

function plotHistogram(plotTitle, dataColumnName, numBins)
{
    if(numBins == undefined)
    {
        numBins = 20;
    }

    var data = getDataInColumn(dataColumnName);
    var hist = calculateHistogram(numBins, data);

    //hide all the plots
    clearView();

    $('#plot').show();

    var seriesName = "Features";
    $('#plot').highcharts({
        title: {
            text: plotTitle
        },
        navigation: {
            buttonOptions: {
                enabled: false
            }
        },
        credits: {
            enabled: false
        },
        chart: {
            type: 'column',
            zoomType: 'xy',
            borderWidth: 2
        },
        plotOptions: {
            column: {
                pointPadding: 0,
                borderWidth: 1,
                groupPadding: 0,
                shadow: false
            }
        },
        xAxis:
        {
            title: {
                text: dataColumnName
            }
        },
        yAxis:
        {
            title: {
                text: "Occurrences"
            }
        },
        legend:
        {
            layout: 'vertical',
            align: 'right',
            verticalAlign: 'middle',
            borderWidth: 0
        },
        tooltip:
        {
            enabled: true,
            formatter: function () {
                return seriesName + ': ' +  this.y;
            }
        },
        series: [
            {
                name: seriesName,
                data: hist
            }
        ]
    }, zoomAnnotation);

    //remove any existing histogram divs
    $("#histogramBins").remove();

    var numBinsDiv = $("<div id='histogramBins'/>");
    //var numBins = $("<input id='numBins' type='text' />");
    var numBinsButton = $("<button id='updateNumBins'>Update</button>").click(function()
    {
        //get histogram plot
        var histPlot = $("#plot").highcharts();

        //there should only be one series so select the first
        if(histPlot != undefined && histPlot.series.length < 1)
        {
            return;
        }

        var histogramSeries = histPlot.series[0];
        var numBins = $("#numBins").val();
        numBins = parseInt(numBins);
        //Check if a value was specified for the number of bins
        if(numBins == undefined || numBins.length == 0 || isNaN(numBins))
        {
            return;
        }

        var dataColName = $("#plot").data("dataColName");
        var hist = calculateHistogram(numBins, cmsOdf[dataColName]);
        histogramSeries.setData(hist);
    });

    numBinsDiv.append("<label>Number of bins: <input id='numBins' type='text' value='"+ numBins + "'/> </label>");

    numBinsDiv.append(numBinsButton);
    $("<div/>").append(numBinsDiv).insertAfter("#plot");

    $('#numBins').w2field('int', { autoFormat: false });
}

function plotHeatmap()
{
    $("#cmsScorePlot").hide();
    $("#histogramBins").remove();

    $('#plot').highcharts({
        /*data: {
            csv: document.getElementById('csv').innerHTML
        },*/
        chart: {
            type: 'heatmap',
            inverted: true,
            backgroundColor: "#E6E6E6"
        },
        navigation: {
            buttonOptions: {
                enabled: false
            }
        },
        title: {
            text: 'Heatmap',
            align: 'left'
        },
        yAxis: {
            title: {
                text: null
            },
            minPadding: 0,
            maxPadding: 0,
            startOnTick: false,
            endOnTick: false
        },

        colorAxis: {
            stops: [
                [-20000, '#3060cf'],
                [0.5, '#ffffff'],
                [20000, '#c4463a']
            ],
            min: -20000
        },
        series: [{
            data: dataset.matrix.slice(1, 1),
            borderWidth: 0
        }]
    }, zoomAnnotation);
}

function displayExpressionProfile(plotTitle, xDataName, yDataName, samples, series)
{
    $("#cmsScorePlot").hide();
    $("#histogramBins").remove();

    $('#plot').show();

    $("#plot").highcharts({
        chart: {
            zoomType: 'xy',
            borderWidth: 2
        },
        credits: {
            enabled: false
        },
        navigation: {
            buttonOptions: {
                enabled: false
            }
        },
        title: {
            text: plotTitle,
            x: -20 //center
        },
        xAxis: {
            categories: samples
        },
        yAxis: {
            title: {
                text: yDataName
            },
            plotLines: [{
                value: 0,
                width: 1,
                color: '#808080'
            }]
        },
        endend: {
            layout: 'vertical',
            align: 'right',
            verticalAlign: 'middle',
            borderWidth: 0,

            labelFormat: "{name}"

        },
        series: series
    }, zoomAnnotation);
}

function expressionProfile()
{
    $("#histogramBins").remove();

    var selectedRecordsList = w2ui['cmsTable'].getSelection();

    if(selectedRecordsList.length == 0)
    {
        w2alert("Please select a row from the table!", "Expression Profile Error");
    }
    else if(selectedRecordsList.length <= 10) {

        var series = [];
        for(var s = 0; s < selectedRecordsList.length; s++)
        {
            var selectedFeature = w2ui['cmsTable'].get(selectedRecordsList[s])["Feature"];
            var rowIndex = $.inArray(selectedFeature, dataset.rowNames);
            if (rowIndex != -1) {
                var rowData = dataset.matrix[rowIndex];

                series.push(
                    {
                        name: selectedFeature,
                        data: rowData,
                        type: "line",
                        lineWidth: 1
                    }
                );
            }

        }
        displayExpressionProfile("Expression Profile", "Sample", "Value", dataset.sampleNames, series);

    }
    else
    {
        w2alert("Only 10 rows can be selected from the table!", "Expression Profile Error");
    }
}

function filterFeatures()
{
    w2popup.open({
        title   : 'Filter Features',
        width   : 620,
        opacity : 0,
        height  : 300,
        showMax : true,
        body    : '<div id="filterDialog"></div>',
        buttons : '<button class="btn" onclick="w2popup.close();">Cancel</button> '+
            '<button class="btn" id="applyFilter">OK</button>',
        onOpen  : function (event) {
            event.onComplete = function () {

                $("#filterDialog").append("<div id='filterOptions'/>");

                var addFilterBtn = $("<button class='btn'>Add Filter</button>");
                addFilterBtn.click(function()
                {
                    var div = $("<div class='filterRow'/>");
                    var list = '<input class="filterScore" type="list">';
                    div.append(list);
                    div.append("<span> >= " +
                        "<input type='text' class='greaterThanFilter'> and <= <input type='text' class='lessThanFilter'></span>");

                    $("#filterOptions").append(div);

                    var statColumns = [];
                    for(var c=0;c<cmsOdf["COLUMN_NAMES"].length;c++)
                    {
                        if(cmsOdf["COLUMN_NAMES"][c] != "Feature" && cmsOdf["COLUMN_NAMES"][c] != "Description")
                        {
                            statColumns.push(cmsOdf["COLUMN_NAMES"][c]);
                        }
                    }

                    $(".filterScore").last().w2field('list',
                    {
                        items: statColumns,
                        selected: statColumns[0]
                    });
                });

                $("<div/>").append(addFilterBtn).appendTo("#filterDialog");

                addFilterBtn.click();

                $("#applyFilter").click(function()
                {
                    var filterObj = [];
                    $(".filterRow").each(function(){
                        var columnName = $(this).find(".filterScore").val();
                        var greater = parseFloat($(this).find(".greaterThanFilter").val());
                        var less = parseFloat($(this).find(".lessThanFilter").val());

                        filterObj.push({
                            columnName: columnName,
                            greater: greater,
                            less: less
                        })
                    });

                    var filterApplied = applyFilter(filterObj);

                    if(filterApplied)
                    {
                        w2popup.close()
                    }
                })
            };
        },
        onToggle: function (event) {
            event.onComplete = function () {
                //w2ui.layout.resize();
            }
        }
    });
}

function isHeatMapVisible()
{
    return $("#heatMapMain").is(":visible");
}

function editHeatMapOptions()
{
    w2popup.open({
        title: 'Display Options',
        width: 470,
        opacity: 0,
        height: 345,
        showMax: true,
        body: '<div id="displayHeatMapOptionsDialog"></div>',
        buttons: '<button class="btn" onclick="w2popup.close();">Cancel</button> ' +
            '<button class="btn" id="updateHeatMapOptions">OK</button>',
        onOpen: function (event) {
            event.onComplete = function () {
                var optionsDialog = $("<div/>").addClass("heatMapOptionsDialog");

                var legendDiv = $("<div/>");
                var legendControl = $("<input type='checkbox'/>").attr("id", "legendOption");

                if(cmsHeatMap.isLegendVisible())
                {
                    legendControl.prop('checked', 'checked');
                }

                $("<label>Display Legend</label>").prepend(legendControl).appendTo(legendDiv);
                optionsDialog.append(legendDiv);

                optionsDialog.append($("<div/>").addClass("space")
                    .append($("<label>Color Scheme: </label>")
                        .append($("<input type='radio' id='relativeScheme' name='cScheme' value='relative'>" +
                            "<label for='relativeScheme'>Row Relative</label>"))
                        .append($("<input type='radio' id='globalScheme' name='cScheme' value='global'>" +
                            "<label for='globalScheme'>Global</label>")))
                    .append($("<div/>").addClass("space")
                        .append($("<input type='radio' id='gradientColors' name='discreteGradient' value='gradient'>")
                            .click(function()
                            {
                                $("#gradientColorTable").show();
                                $("#discreteColorsDiv").hide();

                                var hColors = cmsHeatMap.getColors();

                                var index = 0;
                                while(hColors != undefined && index < hColors.length)
                                {
                                    var hexColor = (new jheatmap.utils.RGBColor(hColors[index])).toHex();

                                    $($(".gradientColor").get(index)).spectrum("set", hexColor);
                                    index++;
                                }
                            }))
                        .append("<label for='gradientColors'>Use Gradient Colors</label>")
                        .append($("<input type='radio' id='discreteColors' name='discreteGradient' value='discrete'>")
                            .click(function()
                            {
                                $("#discreteColorsDiv").show();
                                $("#gradientColorTable").hide();

                                $("#discreteColorsList").empty();

                                //Set the discrete colors
                                var hColors = cmsHeatMap.getColors();

                                var index = 0;
                                while(hColors != undefined && index < hColors.length)
                                {
                                    var hexColor = (new jheatmap.utils.RGBColor(hColors[index])).toHex();

                                    $("#addColor").click();
                                    $($(".discreteColor").get(index)).spectrum("set", hexColor);
                                    index++;
                                }
                            }))
                        .append("<label for='discreteColors'>Use Discrete Colors</label>")))
                    .append($("<table/>").attr("id", "gradientColorTable").hide()
                        .append($("<tr>")
                            .append("<td>Minimum Color: </td>")
                            .append('<td><input id="minColor" type="text" class="gradientColor" title="Minimum' +'"value="#0000FF"/></td>'))
                        .append($("<tr>")
                            .append("<td>Midway Color:</td>")
                            .append('<td><input id="midColor" type="text" class="gradientColor" title="Midway' +'" value="#FFFFFF"/> </td>'))
                        .append($("<tr>")
                            .append("<td>Maximum Color:</td>")
                            .append('<td><input id="maxColor" type="text" class="gradientColor" title="Maximum' +'" value="#FF0000"/></td>')))
                    .append($("<div/>").attr("id", "discreteColorsDiv").hide()
                        .append($("<ul/>").attr("id", "discreteColorsList"))
                        .append($("<button class='btn'>Add Color</button>").attr("id", "addColor").button()
                            .click(function()
                            {
                                var delButton = $("<button>x</button>").addClass("btn");
                                delButton.button().click(function()
                                {
                                    $(this).parent("li").remove();
                                });

                                var colorInput = $('<input type="text" class="discreteColor" value="#000000"/>');
                                $("<li/>").append(colorInput).append(delButton).appendTo("#discreteColorsList");
                                colorInput.spectrum();
                            })));
                $("#displayHeatMapOptionsDialog").append(optionsDialog);

                $(".gradientColor").spectrum();
                if(cmsHeatMap.colorScheme == cmsHeatMap.COLOR_SCHEME.GLOBAL)
                {
                    optionsDialog.find("input[name='cScheme'][value='global']").prop('checked', 'checked');
                }
                else
                {
                    optionsDialog.find("input[name='cScheme'][value='relative']").prop('checked', 'checked');
                }

                if(cmsHeatMap.isDiscrete)
                {
                    optionsDialog.find("input[name='discreteGradient'][value='discrete']").click();
                    optionsDialog.find("input[name='discreteGradient'][value='discrete']").prop('checked', 'checked');
                }
                else
                {
                    optionsDialog.find("input[name='discreteGradient'][value='gradient']").click();
                    optionsDialog.find("input[name='discreteGradient'][value='gradient']").prop('checked', 'checked');
                }
            }
        }
    });

    $("#updateHeatMapOptions").click(function(event)
    {
        var showLegend = $("#legendOption").is(":checked");
        var options =
        {
            showLegend: showLegend,
            poweredByJHeatmap: false,
            controls : {
                columnSelector: false,
                rowSelector: false
            }
        };

        var heatMapColors = cmsHeatMap.getColors();

        var isDiscrete = $("input[name='discreteGradient']:checked").val() == "discrete";

        cmsHeatMap.isDiscrete = isDiscrete;

        if(!cmsHeatMap.isDiscrete)
        {
            $(".gradientColor").each(function()
            {
                var rgbColorObj = $(this).spectrum("get").toRgb() ;
                var R = Math.round(rgbColorObj.r); //hexToR(hexColor);
                var G = Math.round(rgbColorObj.g); //hexToG(hexColor);
                var B = Math.round(rgbColorObj.b); // hexToB(hexColor);

                var rgbColor = [R, G, B];

                var title = $(this).attr('title');
                if (title == "Minimum") {
                    if (heatMapColors == undefined || heatMapColors == null || heatMapColors.length < 1) {
                        heatMapColors.push("");
                    }
                    heatMapColors[0] = rgbColor;
                }
                if (title == "Midway") {
                    if (heatMapColors == undefined || heatMapColors == null || heatMapColors.length < 2) {
                        heatMapColors.push("");
                    }
                    heatMapColors[1] = rgbColor;
                }
                if (title == "Maximum") {
                    if (heatMapColors == undefined || heatMapColors == null || heatMapColors.length < 3) {
                        heatMapColors.push("");
                    }
                    heatMapColors[2] = rgbColor;
                }

                cmsHeatMap.setColors(heatMapColors);
            });
        }
        else
        {
            var discreteHeatmapColors = [];
            $(".discreteColor").each(function()
            {
                var rgbColorObj = $(this).spectrum("get").toRgb() ;
                var R = Math.round(rgbColorObj.r);
                var G = Math.round(rgbColorObj.g);
                var B = Math.round(rgbColorObj.b);

                var rgbColor = [R, G, B];

                discreteHeatmapColors.push(rgbColor);
            });

            cmsHeatMap.setColors(discreteHeatmapColors);
        }

        //Check that a color is set
        heatMapColors = cmsHeatMap.getColors();
        if(heatMapColors == undefined || heatMapColors.length < 1)
        {
            var errorMsg = "Error: no colors specified!";
            w2alert(errorMsg);
            return;
        }

        var colorScheme = $("input[name='cScheme']:checked").val();

        if(colorScheme == "global")
        {
            cmsHeatMap.updateColorScheme(cmsHeatMap.COLOR_SCHEME.GLOBAL, isDiscrete, options);
        }
        else
        {
            cmsHeatMap.updateColorScheme(cmsHeatMap.COLOR_SCHEME.RELATIVE, isDiscrete, options);
        }

        w2popup.close();
    });
}
function editPlotOptions()
{
    w2popup.open({
        title   : 'Display Options',
        width   : 480,
        opacity : 0,
        height  : 370,
        showMax : true,
        body    : '<div id="displayOptionsDialog"><div id="displayTabs" style="width: 100%; height: 29px;"></div>' +
            '<div id="displayTab1" class="tab"></div><div id="displayTab2" class="tab"></div>',
        buttons : '<button class="btn" onclick="w2popup.close();">Cancel</button> '+
            '<button class="btn" id="updateDisplayOptions">OK</button>',
        onOpen  : function (event) {
            event.onComplete = function () {

                $("#displayOptionsDialog").append("<div id='displayOptions'/>");

                var titleField = $("<input id='plotTitle' type='text'/>");

                var subTitleField = $("<input id='plotSubTitle' type='text'/>");
                subTitleField.keyup(function()
                {
                    if($(this).val().length < 1 & $("#plotTitle").val() < 1)
                    {
                        $("#updateDisplayOptions").prop('disabled', true);
                    }
                    else
                    {
                        $("#updateDisplayOptions").prop('disabled', false);

                    }
                });

                var table = $("<table id='displayOptionsTable'>");
                $("#displayTab1").append(table);
                $("<tr/>").append($("<td/>").append("Plot title:")).append($("<td/>").append(titleField)).appendTo(table);
                $("<tr/>").append($("<td/>").append("Plot subtitle:")).append($("<td/>")
                    .append(subTitleField)).appendTo(table);


                //add fields to change the series color
                var currentChart;
                if($("#cmsScorePlot").is(":visible"))
                {
                    currentChart = $("#cmsScorePlot").highcharts();
                }
                else
                {
                    currentChart = $("#plot").highcharts();
                }


                if(currentChart.options.title.text !== undefined
                    && currentChart.options.title.text !== null)
                {
                    titleField.val(currentChart.options.title.text);
                }

                var series = currentChart.series;

                var plotColorTable = $("<table id='plotColorTable'>");
                $("#displayTab2").append(plotColorTable);
                for(var s=0;s<series.length;s++)
                {
                    var colorField =
                        $('<input type="text" title="' + series[s].name +'" class="colorPicker" data-control="hue" value="' + series[s].color + '"/>');
                    colorField.data('seriesIndex', s);


                    $("<tr/>").append($("<td/>").append("Series " + (s+1) + ": ")).append($("<td/>")
                     .append(colorField)).appendTo(plotColorTable);
                }

                $(".colorPicker").spectrum();

                $('#displayTabs').w2tabs({
                    name: 'tabs',
                    active: 'displayTab1',
                    tabs: [
                        { id: 'displayTab1', caption: 'Title' },
                        { id: 'displayTab2', caption: 'Plot Colors' }
                    ],
                    onClick: function (event) {
                        $('#displayOptionsDialog .tab').hide();
                        $('#displayOptionsDialog #' + event.target).show();
                    }
                });

                $('#displayTab2').hide();

                $("#updateDisplayOptions").click(function()
                {
                    var chart;
                    if($("#cmsScorePlot").is(":visible"))
                    {
                        chart = $("#cmsScorePlot").highcharts();
                    }
                    else
                    {
                        chart = $("#plot").highcharts();
                    }

                    var plotTitle = $("#plotTitle").val();
                    if(plotTitle && plotTitle.length > 0)
                    {
                        chart.setTitle({text: plotTitle});
                    }

                    var plotSubTitle = $("#plotSubTitle").val();
                    if(plotSubTitle && plotSubTitle.length > 0)
                    {
                        chart.setTitle({}, {text: plotSubTitle});
                    }

                    var seriesChart = chart.series;

                    $(".colorPicker").each(function(index)
                    {
                        var color =  $(this).spectrum("get").toHexString();
                        seriesChart[index].color = color;
                        seriesChart[index].options.color = color;
                        seriesChart[index].update(seriesChart[index].options);
                    });

                    w2ui['tabs'].destroy();
                    w2popup.close();
                });
            };
        },
        onToggle: function (event) {
            event.onComplete = function () {
                //w2ui.layout.resize();
            }
        }
    });
}

/*
filterObj: an object containing the fields columnName, greater, and less
 */
function applyFilter(filterObj)
{
    var records = w2ui['cmsTable'].records;

    var visibleRecords = [];
    var visibleFeatureNames = [];
    var subsetIds = [];
    for(var r=0;r<records.length;r++)
    {
        var record = records[r];
        var f=0;

        var stop = false;
        while(!stop && f < filterObj.length)
        {
            var columnName = filterObj[f].columnName;
            var value = record[columnName];
            var greater = filterObj[f].greater;
            var less = filterObj[f].less;

            if (greater !== undefined && $.isNumeric(greater)) {
                if (value < greater) {
                    stop = true;
                }
            }
            if (!stop && less !== undefined && $.isNumeric(less)) {
                if (value > less) {
                    stop = true;
                }
            }

            f++;
        }

        //if we made it to the end of the filter object then the row passes all the filters
        if (!stop && f == filterObj.length) {
            visibleRecords.push(record);
            visibleFeatureNames.push(record["Feature"]);
            subsetIds.push(record.recid);
        }
    }

    if(visibleRecords.length > 0)
    {
        w2ui['cmsTable'].records = visibleRecords;
        w2ui['cmsTable'].refresh();

        updateNumRecordsInfo(visibleRecords.length, cmsOdf[cmsOdf.COLUMN_NAMES[0]].length);

        //scorePlot(w2ui['cmsTable'].records);

        displayHeatMap({
            filterRow: visibleFeatureNames
        });

        return true;
    }
    else
    {
        alert("No records match the filter.");
        return false;
    }
}

/*
 function applyFilter(columnName, greater, less)
 {
 var records = w2ui['cmsTable'].records;

 var visibleRecords = [];
 for(var r=0;r<records.length;r++)
 {
 var record = records[r];
 var value = record[columnName];
 var accept = false;
 if(greater !== undefined && $.isNumeric(greater))
 {
 if(value >= greater)
 {
 accept = true;
 }
 }
 if(less !== undefined && $.isNumeric(less))
 {
 if(value <= less)
 {
 accept = true;
 }
 else
 {
 accept = false;
 }
 }

 if(accept)
 {
 visibleRecords.push({ field: 'recid', value: record.recid, operator: 'is'});
 }
 }

 if(visibleRecords.length > 0)
 {
 w2ui['cmsTable'].search(visibleRecords, 'OR');
 }
 }*/

/*function initToolbar()
{
    $('#cmsToolbar').w2toolbar({
        name: 'cmsToolbar',
        multiSearch: true,
        items: [
            { type: 'menu',   id: 'file', caption: 'File', items: [
                { text: 'Save Feature List'},
                { text: 'Save Dataset'}
            ]},
            { type: 'menu',   id: 'edit', caption: 'Edit', items: [
                { text: 'Filter Features'}
            ]},
            { type: 'menu',   id: 'view', caption: 'View', items: [
                {text: 'Upregulated Features'},
                { text: 'Profile'},
                { text: 'Histogram'},
                { text: 'Heatmap'}
            ]}
        ],
        onClick: function (event) {
            console.log('Target: '+ event.target, event);
            switch (event.target) {
                case 'file':
                    break;
                case 'edit:Filter Features':
                    filterFeatures();
                   // $("#cmsScorePlot").exportChart({
                   //     filename: "myChart"
                    //});
                    break;
                case 'view:Upregulated Features':
                    if($("#cmsScorePlot").length == 0)
                    {
                        scorePlot();
                    }
                    else
                    {
                        $("#plot").hide();
                        $("#cmsScorePlot").show();
                    }
                    break;
                case 'view:Histogram':
                    plotHistogram("FDR(BH) Histogram", "FDR(BH)", cmsOdf["FDR(BH)"]);
                    break;
                case 'view:Profile':
                    expressionProfile();
                    break;
                //case 'view:Heatmap':
                //    plotHeatmap();
                //    break;
            }
        }
    });
}*/

/**
 ** Display message about how to zoom on the chart
 */
function zoomAnnotation(chart)
{
    chart.renderer.text('Click and drag in the plot area to zoom',  chart.plotLeft + 8, chart.plotTop - 10)
        .css({
            color: '#B0B0B0',
            fontSize: '11px',
            fontStyle: 'italic'
        })
        .add();
}

function updateLinePlot(chartContainer, plotTitle, xDataName, yDataName, series)
{
    $("#histogramBins").remove();

    chartContainer.highcharts({
        chart:{
            borderWidth: 2,
            zoomType: 'xy'
        },
        navigation: {
            buttonOptions: {
                enabled: false
            }
        },
        credits: {
            enabled: false
        },
        title: {
            text: plotTitle
        },
        plotOptions:
        {
            spline: {
                turboThreshold: 10000,
                lineWidth: 2,
                marker: {
                    enabled: false,
                    states: {
                        hover: {
                            enabled : true,
                            radius: 5,
                            lineWidth: 1
                        }
                    }
                }
            },
            series: {
                enableMouseTracking: false
            }
        },
        xAxis:
        {
            title: {
                text: xDataName
            }
        },
        yAxis:
        {
            title: {
                text: yDataName
            },
            plotLines: [{
                value: 0,
                width: 2,
                color: '#808080'
            }]
        },
        legend:
        {
            layout: 'vertical',
            align: 'right',
            verticalAlign: 'middle',
            borderWidth: 0
        },
        tooltip:
        {
            enabled: false
        },
        series: series
    }, zoomAnnotation);
}

function updateScatterPlot(chartContainer, plotTitle, xDataName, yDataName, series)
{
    $("#histogramBins").remove();

    chartContainer.highcharts({
        chart: {
            borderWidth: 2,
            type: 'scatter',
            zoomType: 'xy'
        },
        credits: {
            enabled: false
        },
        plotOptions:
        {
            scatter:
            {
                marker:
                {
                    radius: 3
                }
            }
        },
        navigation: {
            buttonOptions: {
                enabled: false
            }
        },
        title: {
            text: plotTitle
        },
        xAxis:
        {
            title: {
                text: xDataName
            }
        },
        yAxis:
        {
            title: {
                text: yDataName
            }
        },
        legend:
        {
            layout: 'vertical',
            align: 'right',
            verticalAlign: 'middle',
            borderWidth: 0
        },
        tooltip:
        {
            enabled: true
        },
        series: series
    }, zoomAnnotation);
}

function displayHeatMap(options)
{
    clearView();
    $("#heatMapMain").show();

    cmsHeatMap.setColors(null);
    cmsHeatMap.drawHeatMap(options);
}


function scorePlot(records, subsetIds)
{
    if(records == undefined || records.length < 1)
    {
        console.log("No data found to plot scores");
        alert.log("No data found to plot scores");
        return;
    }

    //clear all the plots
    clearView();
    $("#cmsScorePlot").show();

    //create a two dimensional array of the x and y points
    var upRegulatedClassZero = [];
    var upRegulatedClassOne = [];
    var equal = [];

    var xData= "Feature";
    var yData= cmsOdf["Test Statistic"];

    var recordCount = 0;
    for(var x=0;x<records.length;x++)
    {
        if(subsetIds == undefined || subsetIds.length == 0
            || $.inArray(records[x].recid, subsetIds) !== -1) {
            var yValue = records[x][yData];
            if (isNaN(yValue)) {
                yValue = 0;
            }

            if (isFinite(yValue))
            {
                if (yValue > 0) {
                    upRegulatedClassZero.push([recordCount, yValue]);
                }
                else if (yValue < 0) {
                    upRegulatedClassOne.push([recordCount, yValue]);
                }
                else {

                    equal.push([recordCount, yValue]);
                }
            }
            recordCount++;
        }
    }

    var series = [
    {
        name: "Upregulated in " + cmsOdf["Class 0"] + " (" + upRegulatedClassZero.length + ")",
        data: upRegulatedClassZero,
        type: "spline",
        lineWidth: 6,
        color: "#FF0000"
    },
    {
        name: "Upregulated in " + cmsOdf["Class 1"] + " (" + upRegulatedClassOne.length + ")",
        data:  upRegulatedClassOne,
        type: "spline",
        lineWidth: 6,
        color: "#0000ff"
    }];

    updateLinePlot($("#cmsScorePlot"), "Upregulated Features", "Feature", cmsOdf["Test Statistic"], series);
}

function initTable()
{
    if(cmsOdf === undefined ||cmsOdf.COLUMN_NAMES === undefined)
    {
        alert("Error: Unable to find column names in odf file.");
        return;
    }
    //delete the reload button
    var btn = w2obj.grid.prototype.buttons;
    delete btn['reload'];

    $('#cmsTable').w2grid({
        name   : 'cmsTable',
        show: {
            selectColumn: true,
            toolbar: true,
            lineNumbers: true
            //footer: true
        },
        multiSearch: true,
        onColumnOnOff: function(event) {
            console.log(event);

           var state = event.checkbox.checked ? "Showing" : "Hiding";
           gpLib.logToAppLogger(APPLICATION_NAME, state + " column: " + event.field , "table");
        },
        onSearch: function(event)
        {
            event.onComplete = function (event)
            {
                updateNumRecordsInfo(w2ui['cmsTable'].last.searchIds.length, w2ui['cmsTable'].records.length);
            }
        },
        "sortData": [
            { "field": cmsOdf["Test Statistic"], "direction": "DESC" }
        ]
    });

    //First add the required Record Id column
    w2ui['cmsTable'].addColumn({
        field: 'recid',
        caption: 'recid',
        searchable: false
    });

    //add div to display the number of records visible out of total records
    var numVisibleRecords = $("<span/>").attr("id", "numRecordsInfo");
    $("#tb_cmsTable_toolbar_right").append(numVisibleRecords);

    //add button to minimize the table
    var minMaximizeTable = $("<span/>").append($("<img src='css/images/minimize.ico'/>")
        .css("height", "20px").css("width", "20px"));
    minMaximizeTable.click(function()
    {
        var newHeight = $("#heatMapMain").height() + $("#cmsTable").height();

        $("#heatMapMain").data("oldHeatMapHeight", $("#heatmap").height());
        $("#heatMapMain").data("oldHeight", $("#heatMapMain").height());

        $("#heatMapMain").css("height", newHeight);
        var collapseSpan = $("<span/>").append(
        $("<img src='css/images/maximize.ico'/>").addClass("w2ui-toolbar").click(function()
            {
                cmsHeatMap.drawHeatMap({
                    height: $("#heatMapMain").data("oldHeatMapHeight")
                });

                $(this).parent().remove();
                $("#cmsMain").css("overflow", "auto");
                $("#heatMapMain").css("height", $("#heatMapMain").data("oldHeight"));
                $("#cmsTable").show();
            }).css("height", "20px").css("width", "20px").css("float", "right"));

        $("#heatMapMain").prepend(collapseSpan);
        $("#cmsTable").hide();

        $("#cmsMain").css("overflow", "hidden");
        cmsHeatMap.drawHeatMap({
            height: newHeight
        });
    });

    $("#tb_cmsTable_toolbar_right").append(minMaximizeTable);

    for(var c=0;c<cmsOdf.COLUMN_NAMES.length;c++)
    {
        var columnName = cmsOdf.COLUMN_NAMES[c];

        var isHidden = false;
        if(columnName !== "Rank" && columnName !== "Description" && columnName !== "Feature"
            && columnName !== cmsOdf["Test Statistic"] //this is the Score column
            && columnName !== "FDR(BH)" && columnName !== "Fold Change")
        {
            isHidden = true;
        }

        var size = '19%';
        if(columnName === "Rank")
        {
            size = '45px';
        }

        if(columnName === "Description")
        {
            size = '25%';
        }

        w2ui['cmsTable'].addColumn({
            field: columnName,
            caption: columnName,
            size: size,
            hidden: isHidden,
            sortable: true,
            searchable: !isHidden
        });

        w2ui['cmsTable'].addSearch({
            field: columnName,
            caption: columnName,
            type: 'text' });
    }

    resetRecords();
}

function updateNumRecordsInfo(visibleRecords, maxRecords)
{
    var numVisibleRecords = $("#numRecordsInfo");
    numVisibleRecords.empty();
    numVisibleRecords.append("Showing " + visibleRecords + " of " + maxRecords + " features");
}

function resetRecords()
{
    var records = [];
    var numRows = cmsOdf[cmsOdf.COLUMN_NAMES[0]].length;
    for(var r=0;r<numRows;r++)
    {
        var record = {};
        record['recid'] = r;

        for(var c=0;c< cmsOdf.COLUMN_NAMES.length;c++)
        {
            var columnName = cmsOdf.COLUMN_NAMES[c];

            var columnData = cmsOdf[columnName];
            record[columnName] = columnData[r];
        }

        records.push(record);
    }

    w2ui['cmsTable'].reset();
    w2ui['cmsTable'].records = records;
    w2ui['cmsTable'].refresh();

    updateNumRecordsInfo(records.length, numRows);
}

function createDataset()
{
    if(dataset == undefined || dataset.length == 0)
    {
        w2alert("Error: The dataset was not loaded.", "Save Dataset Error");
        return;
    }

    var selectedRecidsArr = w2ui['cmsTable'].getSelection();
    var dataMatrix = dataset.matrix;

    var content = "#1.2\n";

    //add the number of rows and samples
    content += selectedRecidsArr.length + "\t" + dataset.sampleNames.length + "\n";

    //add the header with the column and sample names
    content += "Name\t" + "Description\t" + dataset.sampleNames.join("\t") + "\n";

    for(var s=0;s<selectedRecidsArr.length;s++)
    {
        var row = dataMatrix[w2ui['cmsTable'].get(selectedRecidsArr[s]).recid];
        content += dataset.rowNames[selectedRecidsArr[s]] + '\t';
        content += dataset.rowDescriptions[selectedRecidsArr[s]] + '\t';
        content += row.join("\t");
        content += "\n";
    }

    return content;
}

function createFeatureList(selectedOnly)
{
    var content = "";

    if(selectedOnly == true)
    {
        var selectedRecidsArr = w2ui['cmsTable'].getSelection();
        for(var s=0;s<selectedRecidsArr.length;s++)
        {
            content += w2ui['cmsTable'].get(selectedRecidsArr[s]).Feature;
            content += "\n";
        }
    }
    else
    {
        var records = w2ui['cmsTable'].records;
        for(var r=0;r<records.length;r++)
        {
            var columnNames = Object.keys(records[r]);
            content += records[r][columnNames[0]];
            content += "\n";
        }
    }

    return content;
}

function exportTable()
{
    var records = w2ui['cmsTable'].records;
    var content = "";
    for(var r=0;r<records.length;r++)
    {
        var columnNames = Object.keys(records[r]);
        for(var c=0;c<columnNames.length;c++)
        {
            content += records[r][columnNames[c]];
            content += "\t";
        }
        content += "\n";
    }

    return content;
}

function saveImage(defaultFileName)
{
    var disableSave = false;
    if(defaultFileName === undefined || defaultFileName === null)
    {
        defaultFileName = "cms_image_download";
        disableSave = true;
    }

    w2popup.open({
        title: 'Save Image',
        width: 350,
        height: 240,
        showMax: true,
        modal: true,
        body: '<div id="saveImageDialog" style="margin: 30px 15px 2px 25px;"><label>File name: <input type="text" id="fileName" value="'+ defaultFileName +'"/></label></div>',
        buttons: '<button class="btn" onclick="w2popup.close();">Cancel</button> ' +
            '<button id="saveImageBtn" class="btn">OK</button>',
        onOpen: function (event)
        {
            event.onComplete = function ()
            {
                //Add the image file formats
                var imageFormats = [];

                imageFormats.push("svg");
                imageFormats.push("png");

                //jpeg and pdf is available for the plots generated with highcharts
                if(!$("#heatmap").is(":visible"))
                {
                    imageFormats.push("jpeg");
                    imageFormats.push("pdf");
                }

                //add the save formats that are supported for all images
                var saveFormats = $('<label>File type: <br/> <input type="list" id="fileType"/></label>');

                $("<div/>").append(saveFormats).appendTo("#saveImageDialog");

                $("#fileType").w2field('list',
                {
                    items: imageFormats,
                    selected: imageFormats[0]
                });

                $("#fileName").keyup(function()
                {
                    var value = $(this).val();
                    if(value.length == 0)
                    {
                        $("#saveImageBtn").prop( "disabled", true );
                    }
                    else
                    {
                        $("#saveImageBtn").prop( "disabled", false );
                    }
                });
            };
        }
    });

    if(disableSave)
    {
        $("#saveImageBtn").prop( "disabled", true );
    }

    $("#saveImageBtn").click(function (event)
    {
        blockElement($("#saveImageDialog"), "Saving...", false);
        //$('body').css( 'cursor', 'wait' );
        //w2popup.lock("", true);
        var fileName = $("#fileName").val();
        var fileType = $("#fileType").val();
        var plot = $('#cmsScorePlot');

        if($('#plot').is(":visible")) {
            plot = $('#plot');
        }

        if(!gpUtil.endsWith(fileName, fileType))
        {
            fileName += "." + fileType;
        }

        if($("#heatmap").is(":visible"))
        {
            cmsHeatMap.saveImage(fileName, fileType);
        }
        else
        {
            var chart = plot.highcharts();


            if (fileType.toLowerCase() === "jpeg") {
                fileType = "image/jpeg";

            }
            else if (fileType.toLowerCase() === "svg") {
                fileType = "image/svg+xml";

            }
            else if (type.toLowerCase() === "pdf") {
                fileType = "application/pdf";

            }
            else {
                fileType = "image/png";

            }

            chart.exportChart({
                type: type,
                filename: fileName
            });
        }

        //w2popup.unlock();
        //$('body').css( 'cursor', 'default' );
        w2popup.close();
    });
}

function customPlot()
{
    //prompt the user for the x and y axes
    w2popup.open({
        title   : 'Custom Plot',
        width   : 280,
        opacity: 0,
        height  : 300,
        showMax : true,
        body    : '<div id="customPlotDialog" style="padding-top: 20px;width: 100px"></div>',
        buttons   : '<button class="btn" onclick="w2popup.close();">Cancel</button> '+
            '<button class="btn" id="displayCustomPlot">OK</button>',
        onOpen  : function (event) {
            event.onComplete = function () {
                 var div = $("<div/>");
                 var xAxisList = '<div><label>X-axis: <br/><input id="customXAxis" type="list"></label></div>';
                 div.append(xAxisList);

                 var yAxisList = '<div><label>Y-axis: <br/><input id="customYAxis" type="list"></label></div>';
                 div.append(yAxisList);

                 $("#customPlotDialog").append(div);

                 $("#customXAxis").w2field('list',
                 {
                    items: computedStatsColumnNames,
                    selected: computedStatsColumnNames[0]
                 });

                 $("#customYAxis").w2field('list',
                 {
                    items: computedStatsColumnNames,
                    selected: computedStatsColumnNames[1]
                 });

                 var typeOfPlot = '<div><label>Plot Type: <br/> <input id="customPlotType" type="list"></label></div>';

                 $("#customPlotDialog").append(typeOfPlot);
                 $("#customPlotType").w2field('list',
                 {
                    items: ["Line", "Scatter"],
                    selected: "Line"
                 });

                $("#displayCustomPlot").click(function()
                {
                    var xAxisName = $("#customXAxis").val();
                    var yAxisName = $("#customYAxis").val();

                    var customData = [];

                    var records = w2ui['cmsTable'].records;
                    for(var x=0;x<records.length;x++)
                    {
                        var xValue = records[x][xAxisName];
                        var yValue = records[x][yAxisName];
                        customData.push([xValue, yValue]);
                    }

                    var seriesName = xAxisName + " vs. " + yAxisName;

                    $("#cmsScorePlot").hide();
                    $('#plot').show();

                    var chartType = $("#customPlotType").val();
                    var series = [];

                    gpLib.logToAppLogger(APPLICATION_NAME, "custom plot: " + seriesName + " - " + chartType, "plot");

                    clearView();
                    $("#plot").show();
                    if(chartType === "Scatter")
                    {
                        series = [
                        {
                            name: seriesName,
                            data: customData,
                            color: '#FF0000'
                        }];

                        updateScatterPlot($("#plot"), xAxisName + " vs. " + yAxisName, xAxisName, yAxisName, series);
                    }
                    else
                    {
                        series = [
                        {
                            name: seriesName,
                            data: customData,
                            lineWidth: 3,
                            color: '#FF0000'
                        }];

                        updateLinePlot($("#plot"), xAxisName + " vs. " + yAxisName, xAxisName, yAxisName, series);
                    }

                    w2popup.close();
                });
            };
        },
        onToggle: function (event) {
            event.onComplete = function () {
                //w2ui.layout.resize();
            }
        }
    });
}
function initMenu()
{
    var columnNames = cmsOdf["COLUMN_NAMES"];
    if(columnNames.length > 0)
    {
        var histogramSubMenu = $("<ul/>");

        for(var c=0;c<columnNames.length;c++)
        {
            if(columnNames[c] != "k" && columnNames[c] != "Rank"
                && columnNames[c] != "Feature" && columnNames[c] != "Description")
            {
                histogramSubMenu.append("<li><a href='#'>" + columnNames[c] + '</a></li>');
            }
        }

        $('#histMenu').append(histogramSubMenu);
    }

    $('#cmsMenu').smartmenus();

    $('#cmsMenu').bind('select.smapi', function(e, item)
    {
        var highlightedParent = $(".highlighted").last().contents()[1].textContent;

        if($(item).contents().length == 1)
        {
            var text = $(item).contents()[0].textContent;

            if (highlightedParent === "Histogram") {
                gpLib.logToAppLogger(APPLICATION_NAME, "histogram: " + text, "plot");

                $("#plot").data("dataColName", text);
                plotHistogram(text + " Histogram", text);
            }
            else if(text == "Heatmap")
            {
                displayHeatMap();
            }
            else if(text == "Upregulated Features") {
                gpLib.logToAppLogger(APPLICATION_NAME, "upregulated features", "plot");

                if ($("#cmsScorePlot").children().length == 0) {
                    scorePlot(w2ui['cmsTable'].records);
                }
                else {
                    clearView();
                    $("#cmsScorePlot").show();
                }
            }
            else if(text == "Profile")
            {
                gpLib.logToAppLogger(APPLICATION_NAME, "expression profile", "plot");
                expressionProfile();
            }
            else if(text == "Custom Plot")
            {
                customPlot();
            }
            else if(text == "Edit Filters")
            {
                gpLib.logToAppLogger(APPLICATION_NAME, "filter features", "filter");
                filterFeatures();
            }
            else if(text == "Remove All Filters")
            {
                gpLib.logToAppLogger(APPLICATION_NAME, "remove all filters", "filter");

                //reset the plot and grid in order to show all the features
                resetViewer();

                //remove the filters on the plot
                cmsHeatMap.showAllFeatures();

            }
            else if(text == "Reload Dataset")
            {
                gpLib.logToAppLogger(APPLICATION_NAME, "reset dataset", "display");

                //reload the heatmap
                initHeatMap();
            }
            else if(text == "Display Options")
            {
                gpLib.logToAppLogger(APPLICATION_NAME, "display options", "display");

                if(isHeatMapVisible())
                {
                    editHeatMapOptions();
                }
                else{
                    editPlotOptions();
                }
            }
            else if(text == "Save Table")
            {
                gpLib.logToAppLogger(APPLICATION_NAME, "save table", "save");

                var content = exportTable();
                if(content != undefined && content.length > 0)
                {
                    var defaultFileName = odfFileName.replace(/\.odf$/i, '') + "_table.txt";
                    gpLib.saveFileDialog(content, ".txt", defaultFileName);
                }
            }
            else if(text == "Save Feature List")
            {
                gpLib.logToAppLogger(APPLICATION_NAME, "save feature list", "save");

                /*var selectedOnly = null;
                //prompt the user whether to save all the features or a subset
                w2popup.open({
                    title: 'Save Feature List',
                    width: 600,
                    height: 320,
                    showMax: true,
                    modal: true,
                    body: '<div id="gpDialog"><div/><input type="radio" name="selected"/>' +
                        '<label><input type="radio" name="selected"/>All Features</label></div>',
                    buttons: '<button class="btn" onclick="w2popup.close();">Cancel</button> <button class="btn" onclick="w2popup.close();">OK</button>',
                    onOpen: function (event) {
                        event.onComplete = function () {

                        };
                    },
                    onClose: function (event) {

                    }
                });*/

                var selectedRecordsList = w2ui['cmsTable'].getSelection();

                if(selectedRecordsList.length == 0)
                {
                    w2alert("Please select rows from the table!", "Save Feature List Error");
                }
                else
                {
                    content = createFeatureList(true);
                    if(content != undefined && content.length > 0)
                    {
                        var defaultFileName = odfFileName.replace(/\.odf$/i, '') + "_features.txt";

                        gpLib.saveFileDialog(content, ".txt", defaultFileName);
                    }
                }
            }
            else if(text == "Save Dataset")
            {
                gpLib.logToAppLogger(APPLICATION_NAME, "save dataset", "save");

                var selectedRecordsList = w2ui['cmsTable'].getSelection();

                if(selectedRecordsList.length == 0)
                {
                    w2alert("Please select rows from the table!", "Save Feature List Error");
                }
                else
                {
                    content = createDataset();
                    if(content != undefined && content.length > 0)
                    {
                        var defaultFileName = odfFileName.replace(/\.odf$/i, '') + "_cms.gct";

                        gpLib.saveFileDialog(content, ".gct", defaultFileName);
                    }
                }
            }
            else if(text == "Save Image")
            {
                gpLib.logToAppLogger(APPLICATION_NAME, "save image: " + text.toLowerCase(), "save");

                var defaultFileName = odfFileName.replace(/\.odf$/i, '') + "_img";

                saveImage(defaultFileName);
            }
        }
        else
        {
            event.preventDefault();
        }
    });
}

function displayLoadError(errorMessage)
{
    var errorMsg = errorMessage;
    $("#cmsMain").empty();
    $("#cmsMain").append("<h3 style='color:red'>There was an error loading the ComparativeMarkerSelectionViewer: <p>" + errorMsg +"</p></h3>");
}

function resetViewer()
{
    displayHeatMap();
    resetRecords();
}

function loadCMSViewer()
{
    requestParams = gpUtil.parseQueryString();

    jobResultNumber = requestParams["job.number"];

    if(requestParams["comparative.marker.selection.filename"] === undefined
        ||requestParams["comparative.marker.selection.filename"] === null
        || requestParams["comparative.marker.selection.filename"].length < 1)
    {
        displayLoadError("Comparative marker selection filename was not found");
        console.log("Comparative marker selection filename was not found");
    }
    else
    {
        odfFile = requestParams["comparative.marker.selection.filename"][0];
        //Set the loaded odf file
        //set the name of the gct file
        var parser = $('<a/>');
        parser.attr("href", odfFile);

        odfFileName = parser[0].pathname.substring(parser[0].pathname.lastIndexOf('/')+1);
        odfFileName = decodeURIComponent(odfFileName);
        $("#fileLoaded").append("<span>Loaded: <a href='" + odfFile + "' target='_blank'>" + decodeURIComponent(odfFileName) + "</a></span>");

        //HACK for the GenePattern protocols
        if(odfFile == "ftp://ftp.broadinstitute.org/pub/genepattern/datasets/protocols/all_aml_test.preprocessed.comp.marker.odf")
        {
            odfFile = "https://www.broadinstitute.org/cancer/software/genepattern/data/protocols/all_aml_test.preprocessed.comp.marker.odf";
        }

        loadOdfFile(odfFile);

        //load the expression dataset
        if(requestParams["dataset.filename"] === undefined
            || requestParams["dataset.filename"] === null
            || requestParams["dataset.filename"].length < 1)
        {
            console.log("The dataset file was not found");
        }
        else
        {
            datasetFile = requestParams["dataset.filename"][0];

            //HACK so that the GenePattern protocols work
            if(datasetFile == "ftp://ftp.broadinstitute.org/pub/genepattern/datasets/protocols/all_aml_test.preprocessed.gct")
            {
                datasetFile = "https://www.broadinstitute.org/cancer/software/genepattern/data/protocols/all_aml_test.preprocessed.gct";
            }

            loadDatasetFile(datasetFile);
        }
    }
}

function initHeatMap()
{
    clearView();
    $("#heatMapMain").show();

    $("<div/>").attr("id", "w2ui-lock").appendTo("#heatMapMain");


    $("#heatMapOptions").remove();

    clearTimeout();
    setTimeout(blockElement($("#heatMapMain"), "loading heatmap...", false), 5000);
    cmsHeatMap = new gpVisual.HeatMap(
    {
        dataUrl: datasetFile,
        container: $("#heatmap"),
        showLegend: false,
        onLoadData: function(status)
        {
            if(status !== undefined && status.error !== undefined)
            {
                $("#heatmap").empty();
                $("#heatmap").append("<p class='error'>Error: " + status.error + "</p>");
            }
            else
            {
                setUpHeatMap();
            }
            $("#heatMapMain").unblock();
        }
    });
}

function setUpHeatMap()
{
    //change to the sort to be by the value of the test statistic
    var testStatisticName = cmsOdf["Test Statistic"];
    var testStatisticArr = [testStatisticName];

    //for(var i=0; i<w2ui['cmsTable'].records.length;i++)
    // {
    // testStatisticArr.push(w2ui['cmsTable'].records[i][testStatisticName].toString());
    //}

    var featureNames = cmsHeatMap.getRowNames();
    for(var i=0;i<featureNames.length;i++)
    {
         var match = w2ui['cmsTable'].find({ Feature: featureNames[i] });
         if(match !==undefined && match.length == 1)
         {
             var recid = match[0];
             var record = w2ui['cmsTable'].get(recid);
             testStatisticArr.push(record[testStatisticName].toString());
         }
    }

    cmsHeatMap.addFeatureLabels(null, testStatisticArr, true);
    cmsHeatMap.sortByFeatureLabel(testStatisticName);

    /* lastest calls to sort by annotation
     cmsHeatMap.addDataColumn(testStatisticArr, false);
     cmsHeatMap.sortByColumn(testStatisticName, false);*/

    clearView();
    $("#heatMapMain").show();
}


$(function()
{
    loadCMSViewer();
});