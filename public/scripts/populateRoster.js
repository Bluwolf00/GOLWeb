data = {
    "active_members":
    [
        {"name": "Oksman", "country": "sweden", "rank": "First-Lieutenant"},
        {"name": "Blu.", "country": "scotland", "rank": "Second-Lieutenant"},
        {"name": "Pilgrim", "country": "united kingdom", "rank": "Sergeant"},
        {"name": "Joona", "country": "finland", "rank": "Sergeant"},
        {"name": "Filth", "country": "germany", "rank": "Corporal"},
        {"name": "Rutters", "country": "united kingdom", "rank": "Corporal"},
        {"name": "Juan Sanchez", "country": "slovakia", "rank": "Lance-Corporal"},
        {"name": "Unionjak", "country": "united kingdom", "rank": "Lance-Corporal"},
        {"name": "Parker", "country": "united kingdom", "rank": "Specialist"},
        {"name": "Eric", "country": "netherlands", "rank": "Private-Second-Class"},
        {"name": "ThecMaster", "country": "sweden", "rank": "Private-Second-Class"},
        {"name": "Sam", "country": "united kingdom", "rank": "Private-Second-Class"},
        {"name": "YeyoMan", "country": "united kingdom", "rank": "Private"},
        {"name": "Sophie", "country": "united kingdom", "rank": "Private"},
        {"name": "Hoofed", "country": "united kingdom", "rank": "Private"},
        {"name": "Henkka", "country": "finland", "rank": "Private"},
        {"name": "Arron", "country": "united kingdom", "rank": "Private"},
        {"name": "Phanatik", "country": "united kingdom", "rank": "Private"},
        {"name": "Alquiet", "country": "azerbaijan", "rank": "Recruit"},
        {"name": "Meeri", "country": "germany", "rank": "Recruit"}
    ],

    "reserve_members":
    [
        {"name": "Muki", "country": "finland"},
        {"name": "Apollo", "country": "netherlands"},
        {"name": "Knight", "country": "ireland"},
        {"name": "Panda", "country": "united kingdom"},
        {"name": "Sputnik", "country": "norway"},
        {"name": "Dust", "country": "italy"},
        {"name": "Whyze", "country": "hungary"},
        {"name": "KristerKry", "country": "germany"},
        {"name": "Will", "country": "united kingdom"},
        {"name": "Flay", "country": "hungary"},
        {"name": "Signed", "country": "turkey"},
        {"name": "Camel", "country": "latvia"},
        {"name": "Bio", "country": "united kingdom"},
        {"name": "Oslay", "country": "united kingdom"},
        {"name": "Sokkada", "country": "netherlands"},
        {"name": "IsraelBril", "country": "israel"},
        {"name": "Jester", "country": "turkey"}
    ]
}

function iterate(data) {
    data.active_members.forEach(e => {
        memberName = e.name;
        country = e.country;
        container = null

        switch (e.rank) {
            case "First-Lieutenant":
                container = document.getElementById('1lt-con');
                break;

            case "Second-Lieutenant":
                container = document.getElementById('2lt-con');
                break;
        
            case "Sergeant":
                container = document.getElementById('sgt-con');
                break;

            case "Corporal":
                container = document.getElementById('cpl-con');
                break;

            case "Lance-Corporal":
                container = document.getElementById('lcpl-con');
                break;

            case "Specialist":
                container = document.getElementById('spc-con');
                break;

            case "Private-First-Class":
                container = document.getElementById('pfc-con');
                break;

            case "Private-Second-Class":
                container = document.getElementById('psc-con');
                break;

            case "Private":
                container = document.getElementById('pvt-con');
                break;

            case "Recruit":
                container = document.getElementById('rct-con');
                break;

            default:
                break;
        };

        addToRoster(memberName,country,container);
    });

    data.reserve_members.forEach(e => {
        memberName = e.name;
        country = e.country;
        container = document.getElementById('rsv-con');

        addToRoster(memberName,country,container);
    });
}

function addToRoster(memberName,country,container) {
    
    if (container.id != 'rsv-con') {
    elements = '<div class="row mb-3"><div class="col-sm-6 roster-col-lg"><p class="lead roster-user"><a href="/profile?name='+memberName+'">'+memberName+'</a></p></div><div class="col-sm-2 roster-col-sm"><img class="nation-img" src="img/nation/'+country+'.png" alt="england"></div></div>';
    } else {
        elements = '<div class="row mb-3"><div class="col-sm-6 roster-col-lg"><p class="lead roster-user"><a href="#">'+memberName+'</a></p></div><div class="col-sm-2 roster-col-sm"><img class="nation-img" src="img/nation/'+country+'.png" alt="england"></div></div>';
    }
    container.innerHTML += elements;
}

function takeJSON() {
    const fs = require('fs')

    fs.readFile('./ranks.json','utf-8', (err, jsonS) => {
        if (err) {
            console.log(err);
        } else {
            try {
                var data = JSON.parse(jsonS);
            } catch (err) {
                console.log("Error Parsing JSON", err);
            }
        }
    });
}

document.addEventListener('DOMContentLoaded', function() {
    iterate(data)
}, false);