var jobResultNumber;
var inputFile;
var dataset;
var cmsOdf;
var datasetFile;
var odfFile;

function displayViewer(data)
{
    //dataset = gpLib.parseGCTFile(data);
    cmsOdf = gpLib.parseODF(data, "Comparative Marker Selection");
    console.log("Finished parsing the odf file " + odfFile);


    //Rename the Score to the name of the Test Statistic
    var testStatisticLabel = cmsOdf["Test Statistic"];
    cmsOdf[testStatisticLabel] = cmsOdf["Score"];
    delete cmsOdf["Score"];

    var columnIndex = $.inArray("Score", cmsOdf.COLUMN_NAMES);
    cmsOdf.COLUMN_NAMES[columnIndex] = testStatisticLabel;

    initPlot();
    initTable();
}

function updatePlot(plotTitle, xData, yData)
{
    //create a two dimensional array of the x and y points
    var upRegulatedClassZero = [];
    var upRegulatedClassOne = [];
    var equal = [];

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

    $('#cmsPlot').highcharts({
        title: {
            text: plotTitle,
            x: -20 //center
        },
        chart:{
            borderWidth: 2
        }
        ,
        //type: "spline",
        //zoomType: 'x',
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
        },
        series: [
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
                lineWidth: 5,
                color: "blue"
            }]
    });
}

function initPlot()
{
    updatePlot("Upregulated Features", "Feature", cmsOdf["Test Statistic"]);
}

function initTable()
{
    if(cmsOdf === undefined ||cmsOdf.COLUMN_NAMES === undefined)
    {
        alert("Error: Unable to find column names in odf file.");
        return;
    }

    $('#cmsTable').w2grid({
        name   : 'cmsTable',
        show: {
            //footer: false,
            //header: true,
            selectColumn: true,
            toolbar: true
        },
        "sortData": [
            { "field": cmsOdf["Test Statistic"], "direction": "DESC" }
        ],
        multiSelect : true
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

        var size = '20%';
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
            sortable: true
        });
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
        gpLib.getDataAtUrl(odfFile, displayViewer);
    }
});