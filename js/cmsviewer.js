var jobResultNumber;
var dataset;
var cmsOdf;
var datasetFile;
var odfFile;

function loadDataset(data)
{
    dataset = gpLib.parseGCTFile(data);
}
function displayViewer(data)
{
    cmsOdf = gpLib.parseODF(data, "Comparative Marker Selection");
    console.log("Finished parsing the odf file " + odfFile);


    //Rename the Score to the name of the Test Statistic
    var testStatisticLabel = cmsOdf["Test Statistic"];
    cmsOdf[testStatisticLabel] = cmsOdf["Score"];
    delete cmsOdf["Score"];

    var columnIndex = $.inArray("Score", cmsOdf.COLUMN_NAMES);
    cmsOdf.COLUMN_NAMES[columnIndex] = testStatisticLabel;

    initToolbar();
    scorePlot();
    initTable();
}

function plotHistogram(plotTitle, xDataName, data)
{
    //calculate the histogram
    var histogram = d3.layout.histogram().bins(20)(data);

    var hist = [];
    for(var h=0;h<histogram.length;h++)
    {
        hist.push(histogram[h].length);
    }

    //hide the main plot
    $("#cmsScorePlot").hide();
    $('#plot').show();

    $('#plot').highcharts({
        title: {
            text: plotTitle,
            x: -20 //center
        },
        chart: {
            type: 'column',
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
                text: "Occurences"
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
}

function displayExpressionProfile(plotTitle, xDataName, yDataName, samples, series)
{
    $("#cmsScorePlot").hide();
    $('#plot').show();

    $("#plot").highcharts({
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

function initToolbar()
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
                case 'edit':
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
                case 'view:Heatmap':
                    break;
            }
        }
    });
}

function updateLinePlot(plotTitle, xData, yData, series)
{
    $('#cmsScorePlot').highcharts({
        title: {
            text: plotTitle,
            x: -20 //center
        },
        chart:{
            borderWidth: 2
        },
        plotOptions:
        {
            spline: {
                turboThreshold: 10000,
                lineWidth: 2,
                /*states: {
                    hover: {
                        enabled: true,
                        lineWidth: 3
                    }
                },*/
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
                text: xData
            }
        },
        yAxis:
        {
            title: {
                text: yData
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
            /*headerFormat: function()
            {
                var index = '{point.key}';
                console.log("index is: " + index);
                return '<span style="font-size: 10px">'+ cmsOdf["Feature"][index] +' </span><br/>';
            }*/
        },
        series: series
    });
}

function scorePlot()
{
    //create a two dimensional array of the x and y points
    var upRegulatedClassZero = [];
    var upRegulatedClassOne = [];
    var equal = [];

    var xData= "Feature";
    var yData= cmsOdf["Test Statistic"];
    var numPoints = cmsOdf[xData].length;
    for(var x=0;x<numPoints;x++) {

        var xValue = cmsOdf[xData][x];
        var yValue = cmsOdf[yData][x];
        if (yValue > 0)
        {
            upRegulatedClassZero.push([x, yValue]);

        }
        else if (yValue < 0)
        {
            upRegulatedClassOne.push([x, yValue]);
        }
        else
        {
            if(isNaN(yValue))
            {
                yValue = 0;
            }

            equal.push([x, yValue]);
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

    updateLinePlot("Upregulated Features", "Feature", cmsOdf["Test Statistic"], series);
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
        //load the odf file and display plot and table
        gpLib.getDataAtUrl(odfFile, displayViewer);

        //load the expression dataset
        gpLib.getDataAtUrl(datasetFile, loadDataset, function()
        {
            alert("Failed to load the dataset at " + datasetFile);
        });
    }
});