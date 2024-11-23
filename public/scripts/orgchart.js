// Org Chart from https://github.com/bumbeishvili/org-chart/tree/master

data2 = [{
    "name": "Oksman",
    "image": "img/nation/sweden.png",
    "rank": "First Lieutenant",
    "id": "O-0001",
    "parentId": "",
    "nick": ""
},
{
    "name": "Blu.",
    "image": "img/nation/scotland.png",
    "rank": "Second Lieutenant",
    "id": "O-0002",
    "parentId": "O-0001",
    "nick": ""
},
{
    "name": "Pilgrim",
    "image": "img/nation/england.png",
    "rank": "Sergeant",
    "id": "N-0003",
    "parentId": "O-0001",
    "nick": ""
},
{
    "name": "Joona",
    "image": "img/nation/finland.png",
    "rank": "Sergeant",
    "id": "N-0004",
    "parentId": "O-0001",
    "nick": "AT Lord"
},
{
    "name": "Filth",
    "image": "img/nation/germany.png",
    "rank": "Corporal",
    "id": "N-0005",
    "parentId": "O-0001",
    "nick": ""
},
{
    "name": "Rutters",
    "image": "img/nation/england.png",
    "rank": "Corporal",
    "id": "N-0006",
    "parentId": "O-0001",
    "nick": ""
},
{
    "name": "Hoofed",
    "image": "img/nation/england.png",
    "rank": "Airman",
    "id": "E-0007",
    "parentId": "O-0002",
    "nick": ""
},
{
    "name": "ThecMaster",
    "image": "img/nation/sweden.png",
    "rank": "Airman",
    "id": "E-0008",
    "parentId": "O-0002",
    "nick": ""
}
];

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
            return `
                        <div style='width:${d.width
                }px;height:${d.height}px;padding-top:${imageDiffVert - 2}px;padding-left:1px;padding-right:1px'>
                                <div style="font-family: 'Inter', sans-serif;background-color:${color};  margin-left:-1px;width:${d.width - 2}px;height:${d.height - imageDiffVert}px;border-radius:10px;border: 1px solid #E4E2E9">
                                    <div style="color:#e07f10;display:flex;justify-content:flex-end;margin-top:5px;margin-right:8px">#${d.data.id
                }</div>
                                    <div style="background-color:${color};margin-top:${-imageDiffVert - 20}px;margin-left:${15}px;border-radius:100px;width:50px;height:50px;" ></div>
                                    <div style="margin-top:${-imageDiffVert - 20
                }px;">   <img src=" ${d.data.image}" style="margin-left:${20}px;border-radius:100px;width:40px;height:40px;" /></div>
                                    <div style="font-size:15px;color:#FFFFFF;margin-left:20px;margin-top:10px">  ${d.data.name
                } </div>
                                    <div style="color:#e07f10;margin-left:20px;margin-top:3px;font-size:10px;"> ${d.data.rank
                } </div>
                                    <div style="color:#e07f10;margin-left:20px;margin-top:3px;font-size:10px;"> ${d.data.nick
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