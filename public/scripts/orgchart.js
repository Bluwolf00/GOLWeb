// Org Chart from https://github.com/bumbeishvili/org-chart/tree/master

function createOrg(data) {
    new d3.OrgChart()
        .nodeHeight((d) => 85 + 25)
        .nodeWidth((d) => 220 + 2)
        .childrenMargin((d) => 50)
        .compactMarginBetween((d) => 35)
        .compactMarginPair((d) => 30)
        .neighbourMargin((a, b) => 20)
        .compact(false)
        .pagingStep(10)
        .nodeContent(function (d, i, arr, state) {
            const color = 'transparent';
            const imageDiffVert = 25 + 2;
            const textcolor = "#2287ad";
            return `
                        <div style='width:${d.width}px;height:${d.height}px;padding-top:${imageDiffVert - 2}px;padding-left:1px;padding-right:1px'>
                            <div style="font-family: 'Inter', sans-serif;background-color:${color};  margin-left:-1px;width:${d.width - 2}px;height:${d.height - imageDiffVert}px;border-radius:10px;border: 1px solid #E4E2E9">
                                <div style="color:#FFFFFF;display:flex;justify-content:flex-end;margin-top:5px;margin-right:8px">#${d.data.id}</div>
                                <div style="display:flex;justify-content:flex-end;margin-top:5px">   <img src=" ${d.data.rankImg}" style="margin-right:${8}px;border-radius:0px;width:25px;height:25px;" /></div>
                                <div style="background-color:${color};margin-top:${-imageDiffVert - 32}px;margin-left:${15}px;border-radius:100px;width:50px;height:50px;" ></div>
                                <div style="margin-top:${-imageDiffVert - 32}px;">   <img src=" ${d.data.image}" style="margin-left:${20}px;border-radius:100px;width:40px;height:40px;" /></div>
                                <div style="font-size:15px;color:#FFFFFF;margin-left:20px;margin-top:10px">  ${d.data.name
                } </div>
                                    <div style="color:${textcolor};margin-left:20px;margin-top:3px;font-size:10px;"> ${d.data.rank
                } </div>
                                    <div style="color:${textcolor};margin-left:20px;margin-top:3px;font-size:10px;"> ${d.data.nick
                } </div>
            
                                </div>
                            </div>
                                    `;
        })
        .container('.chart-container')
        .data(data)
        .render();
}

// fs.readFile('members.json', 'utf-8', function (err,data) {
//     json = JSON.parse(data.orbat)

//     createOrg(json)
// });

$.getJSON("members.json", function(data) {
    createOrg(data.orbat);
});