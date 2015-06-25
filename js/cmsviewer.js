var APPLICATION_NAME= "ComparativeMarkerSelectionViewer version 1";
var jobResultNumber;
var dataset;
var cmsOdf;
var datasetFile;
var odfFile;
var computedStatsColumnNames;

function loadDataset(data) {
    dataset = gpLib.parseGCTFile(data);
}

function displayViewer(data) {
    cmsOdf = gpLib.parseODF(data, "Comparative Marker Selection");
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
    //initToolbar();
    initMenu();
    initTable();
    scorePlot(w2ui['cmsTable'].records);
}

function calculateHistogram(numBins, data)
{
    //calculate the histogram
    var histogram = d3.layout.histogram().bins(numBins)(data);

    var hist = [];
    for(var h=0;h<histogram.length;h++)
    {
        hist.push(histogram[h].length);
    }

    return hist;
}

function plotHistogram(plotTitle, xDataName, data, numBins)
{
    if(numBins == undefined)
    {
        numBins = 20;
    }

    var hist = calculateHistogram(numBins, data);

    //hide the main plot
    $("#cmsScorePlot").hide();
    $('#plot').show();

    $('#plot').highcharts({
        title: {
            text: plotTitle
        },
        navigation: {
            buttonOptions: {
                enabled: false
            }
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
                text: xDataName
            }
        },
        yAxis:
        {
            title: {
                text: "Occurrences"
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
            enabled: true
        },
        series: [
            {
                name: "Features",
                data: hist
            }
        ]
    });

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
    $("<div/>").append(numBinsDiv).appendTo("#plot");

    $('#numBins').w2field('int', { autoFormat: false });
}

function plotHeatmap()
{
    $("#cmsScorePlot").hide();

    /*for(var r=0;r<dataset.matrix.length;r++)
    {

    }*/

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
    });
}

function displayExpressionProfile(plotTitle, xDataName, yDataName, samples, series)
{
    $("#cmsScorePlot").hide();
    $('#plot').show();

    $("#plot").highcharts({
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
        legend: {
            layout: 'vertical',
            align: 'right',
            verticalAlign: 'middle',
            borderWidth: 0
        },
        series: series
    });
}

function expressionProfile()
{
    var selectedRecordsList = w2ui['cmsTable'].getSelection();

    if(selectedRecordsList.length == 1) {
        var selectedFeature = w2ui['cmsTable'].get(selectedRecordsList[0])["Feature"];
        var rowIndex = $.inArray(selectedFeature, dataset.rowNames);
        if (rowIndex != -1) {
            var rowData = dataset.matrix[rowIndex];

            var series = [
                {
                    name: selectedFeature,
                    data: rowData,
                    type: "line",
                    lineWidth: 1,
                    color: "red"
                }
            ];

            displayExpressionProfile("Expression Profile", "Sample", "Value", dataset.sampleNames, series);
        }
    }
    else if(selectedRecordsList.length == 0)
    {
        w2alert("Please select a row from the table!", "Expression Profile Error");
    }
    else
    {
        w2alert("Only one row can be selected from the table!", "Expression Profile Error");
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

                    applyFilter(filterObj);

                    w2popup.close()
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

/*
filterObj: an object containing the fields columnName, greater, and less
 */
function applyFilter(filterObj)
{
    var records = w2ui['cmsTable'].records;

    var visibleRecords = [];
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
            if (less !== undefined && $.isNumeric(less)) {
                if (value > less) {
                    stop = true;
                }
            }

            f++;
        }

        //if we made it to the end of the filter object then the row passes all the filters
        if (!stop && f == filterObj.length) {
            visibleRecords.push({ field: 'recid', value: record.recid, operator: 'is'});
        }
    }

    if(visibleRecords.length > 0)
    {
        w2ui['cmsTable'].search(visibleRecords, 'OR');

        scorePlot(w2ui['cmsTable'].records, w2ui['cmsTable'].last.searchIds);
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

function updateLinePlot(chartContainer, plotTitle, xDataName, yDataName, series)
{
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
            enabled: true
        },
        exporting: {
            buttons: {
                customButton: {
                    text: 'Custom Button',
                    onclick: function () {
                        alert('You pressed custom the button!');
                    }
                },
                anotherButton: {
                    text: 'Another Button',
                    onclick: function () {
                        alert('You pressed new another button!');
                    }
                }
            }
        },
        series: series
    });
}

function updateScatterPlot(chartContainer, plotTitle, xDataName, yDataName, series)
{
    chartContainer.highcharts({
        chart: {
            borderWidth: 2,
            type: 'scatter',
            zoomType: 'xy'
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
    });
}

function scorePlot(records, subsetIds)
{
    //hide the no plot
    $("#cmsScorePlot").show();
    $('#plot').hide();

    if(records == undefined || records.length < 1)
    {
        console.log("No data found to plot scores");
        return;
    }
    //create a two dimensional array of the x and y points
    var upRegulatedClassZero = [];
    var upRegulatedClassOne = [];
    var equal = [];

    var xData= "Feature";
    var yData= cmsOdf["Test Statistic"];
    //var numPoints = cmsOdf[xData].length;

    var recordCount = 0;
    for(var x=0;x<records.length;x++)
    {
        if(subsetIds == undefined || subsetIds.length == 0
            || $.inArray(records[x].recid, subsetIds) !== -1)
        {
            ///var xValue = records[x][xData];
            var yValue = records[x][yData];
            if (yValue > 0)
            {
                upRegulatedClassZero.push([recordCount, yValue]);
            }
            else if (yValue < 0)
            {
                upRegulatedClassOne.push([recordCount, yValue]);
            }
            else
            {
                if(isNaN(yValue))
                {
                    yValue = 0;
                }

                equal.push([recordCount, yValue]);
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
        color: "red"
    },
    {
        name: "Upregulated in " + cmsOdf["Class 1"] + " (" + upRegulatedClassOne.length + ")",
        data:  upRegulatedClassOne,
        type: "spline",
        lineWidth: 6,
        color: "blue"
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
        },
        multiSearch: true,
        onColumnOnOff: function(event) {
            console.log(event);

           var state = event.checkbox.checked ? "Showing" : "Hiding";
           gpLib.logToAppLogger(APPLICATION_NAME, state + " column: " + event.field , "table");
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

    var numRows = cmsOdf[cmsOdf.COLUMN_NAMES[0]].length;

    var records = [];
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

    //add the record
    var result = w2ui['cmsTable'].add(records);

    if (!result) {
        console.log("Failed to add records table");
    }
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
            var feature = w2ui['cmsTable'].get(selectedRecidsArr[s]).Feature;
            content += feature;
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

function saveImage(type)
{
    w2popup.open({
        title: 'Save Image',
        width: 350,
        height: 200,
        showMax: true,
        modal: true,
        body: '<div id="gpDialog" style="margin: 30px 15px 2px 25px;"><label>File name: <input type="text" id="fileName"/></label></div>',
        buttons: '<button class="btn" onclick="w2popup.close();">Cancel</button> ' +
            '<button id="closePopup" class="btn" onclick="w2popup.close();" disabled="disabled">OK</button>',
        onOpen: function (event) {
            event.onComplete = function () {
                $("#fileName").keyup(function()
                {
                    var value = $(this).val();
                    if(value.length == 0)
                    {
                        $("#closePopup").prop( "disabled", true );
                    }
                    else
                    {
                        $("#closePopup").prop( "disabled", false );
                    }
                });
            };
        },
        onClose: function (event) {
            var fileName = $("#fileName").val();
            event.onComplete = function () {
                var plot = $('#cmsScorePlot');

                if($('#plot').is(":visible"))
                {
                    plot = $('#plot');
                }
                var chart = plot.highcharts();

                if(type.toLowerCase() === "jpeg")
                {
                    type = "image/jpeg";

                }
                else if(type.toLowerCase() === "svg")
                {
                    type = "image/svg+xml";

                }
                else if(type.toLowerCase() === "pdf")
                {
                    type = "application/pdf";

                }
                else
                {
                    type = "image/png";

                }

                chart.exportChart({
                    type: type,
                    filename: fileName
                });
            }
        }
    });
}

function customPlot()
{
    //prompt the user for the x and y axes
    w2popup.open({
        title   : 'Custom Plot',
        width   : 570,
        opacity: 0,
        height  : 220,
        showMax : true,
        body    : '<div id="customPlotDialog" style="padding-top: 20px;width: 100px"></div>',
        buttons   : '<button class="btn" onclick="w2popup.close();">Cancel</button> '+
            '<button class="btn" id="displayCustomPlot">OK</button>',
        onOpen  : function (event) {
            event.onComplete = function () {
                 var div = $("<div/>");
                 var xAxisList = '<span><label>X-axis:<input id="customXAxis" type="list"></label></span>';
                 div.append(xAxisList);

                 var yAxisList = '<span><label>Y-axis:<input id="customYAxis" type="list"></label></span>';
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

                 var typeOfPlot = '<span><label>Plot Type:<input id="customPlotType" type="list"></label></span>';

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

                    if(chartType === "Scatter")
                    {
                        series = [
                        {
                            name: seriesName,
                            data: customData,
                            color: 'red'
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
                            color: 'red'
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
                plotHistogram(text + " Histogram", text, cmsOdf[text]);
            }
            else if(text == "Upregulated Features") {
                gpLib.logToAppLogger(APPLICATION_NAME, "upregulated features", "plot");

                if ($("#cmsScorePlot").length == 0) {
                    scorePlot();
                }
                else {
                    $("#plot").hide();
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
                //gpLib.logToAppLogger(APPLICATION_NAME, "custom plot", "plot");
                customPlot();
            }
            else if(text == "Filter Features")
            {
                gpLib.logToAppLogger(APPLICATION_NAME, "filter features", "filter");
                filterFeatures();
            }
            else if(text == "Save Table")
            {
                gpLib.logToAppLogger(APPLICATION_NAME, "save table", "save");

                var content = exportTable();
                if(content != undefined && content.length > 0)
                {
                    gpLib.saveFileDialog(content, ".txt");
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
                        gpLib.saveFileDialog(content, ".txt");
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
                        gpLib.saveFileDialog(content, ".gct");
                    }
                }
            }
            else if(text == "PNG" || text == "JPEG" || text == "SVG" || text == "PDF")
            {
                gpLib.logToAppLogger(APPLICATION_NAME, "save image: " + text.toLowerCase(), "save");

                saveImage(text);
            }
        }
        else
        {
            event.preventDefault();
        }
    });
}

$(function()
{
    var requestParams = gpUtil.parseQueryString();

    jobResultNumber = requestParams["job.number"];

    odfFile = requestParams["comparative.marker.selection.file"];
    datasetFile = requestParams["dataset.file"];

    if(odfFile == null)
    {
        alert("Comparative marker selection file was not found");
        console.log("Comparative marker selection file was not found");
    }
    else
    {
        //Set the loaded odf file
        //set the name of the gct file
        var parser = $('<a/>');
        parser.attr("href", odfFile);

        var odfFileName = parser[0].pathname.substring(parser[0].pathname.lastIndexOf('/')+1);
        $("#fileLoaded").append("<span>Loaded: <a href='" + odfFile + "' target='_blank'>" + odfFileName + "</a></span>");


        var headers = {};

        if(gpLib.isGenomeSpaceFile(odfFile))
        {
            if(requestParams["|gst"] !== undefined && requestParams["|gsu"] !== undefined) {
                headers = {
                    "gs-token": requestParams["|gst"].join(),  //should only be one item
                    "gs-username": requestParams["|gsu"].join()
                };
            }
        }
        //load the odf file and display plot and table
        gpLib.getDataAtUrl(odfFile,
        {   headers: headers,
            successCallBack: displayViewer
        });


        headers = {};
        /*if(gpLib.isGenomeSpaceFile(datasetFile))
        {
            if(requestParams["|gst"] !== undefined && requestParams["|gsu"] !== undefined) {
                headers = {
                    "gs-token": requestParams["|gst"].join(),
                    "gs-username": requestParams["|gsu"].join()
                };
            }
        }*/
        //load the expression dataset
        gpLib.getDataAtUrl(datasetFile,
        {
            headers: headers,
            successCallBack: loadDataset,
            failCallBack: function() {
                alert("Failed to load the dataset at " + datasetFile);

                $("#saveDataset").addClass("disabled");
                $("#profile").addClass("disabled");
            }
        });
    }
});