// Org Chart from https://github.com/bumbeishvili/org-chart/tree/master

async function createOrg(data) {
    new d3.OrgChart()
        .nodeUpdate(function (d, i, arr) {
            if (d.data.nodeId == "root") {
                d3.select(this).style('display', 'none');
            }
        })
        .linkUpdate(function (d, i, arr) {
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
                // var returnString = `<div style='width:${d.width}px;height:${d.height}px;padding-top:${imageDiffVert - 2}px;padding-left:1px;padding-right:1px'>`
                var borderStyle = `1px solid #E4E2E9`;

                // Check if the member is a recruit and has completed their recruitment period (2 events on Thursdays and Sundays)
                // or if the member is a private or private second class and has attended 30 or 60 events respectively
                if ((d.data.rankName == "Recruit" && d.data.thursdays >= 2 && d.data.sundays >= 2)
                    || d.data.rankName == "Private" && d.data.numberOfEventsAttended >= 30
                    || d.data.rankName == "Private Second Class" && d.data.numberOfEventsAttended >= 60
                ) {
                    // Eligible for Promotion
                    borderStyle = `2px solid #c9b52a`;
                } else if (d.data.playerStatus == "Inactive" || d.data.playerStatus == "LOA") {
                    // Inactive or LOA
                    borderStyle = `2px solid #c51010`;
                }
                return `
                            <div style='width:${d.width}px;height:${d.height}px;padding-top:${imageDiffVert - 2}px;padding-left:1px;padding-right:1px'>
                                <div class="node-bubble" onclick="window.location.href = 'https://gol-clan.com/profile?name=${d.data.UName}'" style="font-family: 'Inter', sans-serif;background-color:${nodeColor};  margin-left:-1px;width:${d.width - 2}px;height:${d.height - imageDiffVert}px;border-radius:10px;border: ${borderStyle}">
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
        .render()
        .fit();
}

// Call the endpoint to update the LOAs on the database
async function updateServer() {
    var response = await fetch('/data/updateMemberLOAs', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    });

    response = await fetch('/data/updateAttendance', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    });
}

// Retrieve the data from the server and create the org chart
async function init() {
    await updateServer();
    var res = await fetch('/data/getmembers?withParents=false');
    var data = await res.json();

    var newdata = data.filter(function (el) {
        if (el.nodeId != null) {
            return el;
        }
    });

    // Create dummy data for the root node
    var root = {
        nodeId: "root",
        parentNodeId: null,
        Country: "Sweden",
        rankName: "Root",
        rankPath: "",
        UName: "Root",
        playerStatus: "Active",
        numberOfEventsAttended: 0,
        thursday: 0,
        sunday: 0
    }
    newdata.unshift(root);
    
    createOrg(newdata);

    // Get the number of active members from the data
    var activeMembers = newdata.filter(function (el) {
        return el.playerStatus == "Active";
    });
    document.getElementById("activePlayers").innerHTML = activeMembers.length;

    // Get the total number of members from the data
    document.getElementById("membersCount").innerHTML = newdata.length - 1;

    var fullMembers = newdata.filter(function (el) {
        return el.playerStatus == "Active" || el.playerStatus == "Inactive" || el.playerStatus == "LOA";
    });
    document.getElementById("fullMembers").innerHTML = fullMembers.length;

    var reservists = newdata.filter(function (el) {
        return el.playerStatus == "Reserve";
    });
    document.getElementById("reservistsCount").innerHTML = reservists.length;
};

init();