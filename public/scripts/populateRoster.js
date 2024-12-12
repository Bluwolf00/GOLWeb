function iterate() {

    fetch('/getmembers')
    .then(res => res.json())
    .then(result => {
        result.forEach(e => {
            memberName = e.UName;
            country = e.Country;
            container = null

            switch (e.rankName) {
                case "First Lieutenant":
                    container = document.getElementById('1lt-con');
                    break;
    
                case "Second Lieutenant":
                    container = document.getElementById('2lt-con');
                    break;
            
                case "Sergeant":
                    container = document.getElementById('sgt-con');
                    break;
    
                case "Corporal":
                    container = document.getElementById('cpl-con');
                    break;
    
                case "Lance Corporal":
                    container = document.getElementById('lcpl-con');
                    break;
    
                case "Specialist":
                    container = document.getElementById('spc-con');
                    break;
    
                case "Private First Class":
                    container = document.getElementById('pfc-con');
                    break;
    
                case "Private Second Class":
                    container = document.getElementById('psc-con');
                    break;
    
                case "Private":
                    container = document.getElementById('pvt-con');
                    break;
    
                case "Recruit":
                    container = document.getElementById('rct-con');
                    break;

                case "Reserve":
                    container = document.getElementById('rsv-con');
                    break;
    
                default:
                    break;
            };

            addToRoster(memberName,country,container);
        });
    });

    // data.reserve_members.forEach(e => {
    //     memberName = e.name;
    //     country = e.country;
    //     container = document.getElementById('rsv-con');

    //     addToRoster(memberName,country,container);
    // });
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
    iterate()
}, false);