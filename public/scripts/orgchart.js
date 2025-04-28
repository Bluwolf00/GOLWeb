// Org Chart from https://github.com/bumbeishvili/org-chart/tree/master

function createOrg(data) {
    new d3.OrgChart()
        .nodeUpdate(function (d, i, arr) {
            if (d.data.nodeId == "root") {
                d3.select(this).style('display', 'none');
            }
        })
        .linkUpdate(function (d, i, arr) {
            // console.log(d.parent.id == "root");
            d3.select(this)
            .attr("stroke", d => d.data._upToTheRootHighlighted ? '#E27396' : '#E4E2E9')
            .attr("stroke-width", d => d.data._upToTheRootHighlighted ? 5 : 1)
            if (d.parent.id == "root") {
                d3.select(this).style('display', 'none');
            }
        })
        .nodeHeight((d) => 85 + 25)
        .nodeWidth((d) => 220 + 2)
        .childrenMargin((d) => 50)
        .compactMarginBetween((d) => 35)
        .compactMarginPair((d) => 30)
        .neighbourMargin((a, b) => 20)
        .compact(true)
        .pagingStep(10)
        .initialExpandLevel(4)
        // .nodeId(() => 'orbatID')
        // .parentNodeId(() => "orbatParentID")
        .nodeContent(function (d, i, arr, state) {
            const color = 'transparent';
            const imageDiffVert = 25 + 2;
            const textcolor = "rgb(90, 137, 238)";
            if (d.data.rankName == "Reserve") {
                const nodeColor = 'rgba(255, 234, 116, 0.2)';
                return `
                            <div style='width:${d.width}px;height:${d.height}px;padding-top:${imageDiffVert - 2}px;padding-left:1px;padding-right:1px'>
                                <div class="node-bubble" style="font-family: 'Inter', sans-serif;background-color:${nodeColor};  margin-left:-1px;width:${d.width - 2}px;height:${d.height - imageDiffVert}px;border-radius:10px;border: 1px solid #E4E2E9">
                                    <div style="color:#FFFFFF;display:flex;justify-content:flex-end;margin-top:5px;margin-right:8px">#${d.data.nodeId}</div>
                                    <div style="display:flex;justify-content:flex-end;margin-top:5px">   <img src="img/badge/Placeholder_Badge.png" style="margin-right:${8}px;border-radius:0px;width:25px;height:25px;" /></div>
                                    <div style="background-color:${color};margin-top:${-imageDiffVert - 32}px;margin-left:${15}px;border-radius:100px;width:50px;height:50px;" ></div>
                                    <div style="margin-top:${-imageDiffVert - 32}px;">   <img src="${'img/nation/'+d.data.Country.toLowerCase()+'.png'}" style="margin-left:${20}px;border-radius:100px;width:40px;height:40px;" /></div>
                                    <div class='name-div'>${d.data.UName
                    } </div>
                                        <div style="color:${textcolor};margin-left:20px;margin-top:3px;font-size:10px;"> ${d.data.rankName
                    } </div>
                                        <div style="color:'#FFFFFF';margin-left:20px;margin-top:3px;font-size:10px;"> ${d.data.Nick
                    } </div>
                
                                    </div></a>
                                </div>
                                        `;
            } else {
                var nodeColor;
                switch (d.data.rankName) {
                    case "Sergeant":
                    case "Lance Corporal":
                    case "Corporal":
                    case "Second Lieutenant":
                    case "First Lieutenant":
                        nodeColor = 'rgba(174, 0, 255, 0.2)';
                        
                        break;

                    case "Airman":
                    case "First Class Airman":
                        nodeColor = 'rgba(0, 81, 255, 0.2)';
                        break;

                    default:
                        nodeColor = 'rgba(255, 38, 0, 0.2)';
                        break;
                }
                return `
                            <div style='width:${d.width}px;height:${d.height}px;padding-top:${imageDiffVert - 2}px;padding-left:1px;padding-right:1px'>
                                <div class="node-bubble" onclick="window.location.href = 'https://gol-clan.com/profile?name=${d.data.UName}'" style="font-family: 'Inter', sans-serif;background-color:${nodeColor};  margin-left:-1px;width:${d.width - 2}px;height:${d.height - imageDiffVert}px;border-radius:10px;border: 1px solid #E4E2E9">
                                    <div style="color:#FFFFFF;display:flex;justify-content:flex-end;margin-top:5px;margin-right:8px">#${d.data.nodeId}</div>
                                    <div style="display:flex;justify-content:flex-end;margin-top:5px">   <img src=" ${d.data.rankPath}" style="margin-right:${8}px;border-radius:0px;width:25px;height:25px;" /></div>
                                    <div style="background-color:${color};margin-top:${-imageDiffVert - 32}px;margin-left:${15}px;border-radius:100px;width:50px;height:50px;" ></div>
                                    <div style="margin-top:${-imageDiffVert - 32}px;">   <img src="${'img/nation/'+d.data.Country.toLowerCase()+'.png'}" style="margin-left:${20}px;border-radius:100px;width:40px;height:40px;" /></div>
                                    <div class='name-div'><a href='/profile?name=${d.data.UName}'>  ${d.data.UName
                    } </a></div>
                                        <div style="color:${textcolor};margin-left:20px;margin-top:3px;font-size:10px;"> ${d.data.rankName
                    } </div>
                                        <div style="color:'#FFFFFF';margin-left:20px;margin-top:3px;font-size:10px;"> ${d.data.Nick
                    } </div>
                
                                    </div></a>
                                </div>
                                        `;
            }
        })
        .container('.chart-container')
        .data(data)
        .render();
}

// fs.readFile('members.json', 'utf-8', function (err,data) {
//     json = JSON.parse(data.orbat)

//     createOrg(json)
// });

// $.getJSON("members.json", function(data) {
//     createOrg(data.orbat);
// });

fetch('/getmembers')
    .then(res => res.json())
    .then(data => {
        var newdata = data.filter(function (el) {
            if (el.nodeId != null) {
                return el;
            }
        });
        var root = {
            nodeId: "root",
            parentNodeId: null,
            Country: "Sweden",
            rankName: "Root",
            rankPath: "",
            UName: "Root"
        }
        newdata.unshift(root);

        // console.log(newdata);
        
        createOrg(newdata)
    });