data = {
    "active_members":
    {
        "First-Lieutenant" : [
            {"name": "Oksman", "country": "sweden", "rank": "First-Lieutenant"}
        ],

        "Second-Lieutenant" : [
            {"name": "Blu.", "country": "scotland", "rank": "Second-Lieutenant"}
        ],

        "Sergeant" : [
            {"name": "Pilgrim", "country": "england", "rank": "Sergeant"},
            {"name": "Joona", "country": "finland", "rank": "Sergeant"}
        ],

        "Corporal" : [
            {"name": "Filth", "country": "germany", "rank": "Corporal"},
            {"name": "Rutters", "country": "england", "rank": "Corporal"}
        ],

        "Lance-Corporal" : [
            {"name": "Juan Sanchez", "country": "slovakia", "rank": "Lance-Corporal"},
            {"name": "Unionjak", "country": "england", "rank": "Lance-Corporal"}
        ],

        "Specialist" : [
            {"name": "Parker", "country": "england", "rank": "Specialist"}
        ],

        "Private-Second-Class" : [

        ],

        "Private-Second-Class" : [
            {"name": "Eric", "country": "netherlands", "rank": "Private-Second-Class"},
            {"name": "ThecMaster", "country": "sweden", "rank": "Private-Second-Class"},
            {"name": "Sam", "country": "england", "rank": "Private-Second-Class"}
        ],

        "Private" : [
            {"name": "YeyoMan", "country": "england", "rank": "Private"},
            {"name": "Sophie", "country": "england", "rank": "Private"},
            {"name": "Hoofed", "country": "england", "rank": "Private"},
            {"name": "Henkka", "country": "finland", "rank": "Private"},
            {"name": "Muki", "country": "finland", "rank": "Private"},
            {"name": "Arron", "country": "england", "rank": "Private"},
            {"name": "Phanatik", "country": "england", "rank": "Private"}
        ],

        "Recruit" : [
            {"name": "Alquiet", "country": "azerbajan", "rank": "Recruit"},
            {"name": "Meeri", "country": "germany", "rank": "Recruit"}
        ]
    },

    "reserve_members":
    [
        {"name": "Apollo", "country": "netherlands"},
        {"name": "Knight", "country": "ireland"},
        {"name": "Panda", "country": "england"},
        {"name": "Sputnik", "country": "norway"},
        {"name": "Dust", "country": "italy"},
        {"name": "Whyze", "country": "hungary"},
        {"name": "KristerKry", "country": "germany"},
        {"name": "Will", "country": "england"},
        {"name": "Flay", "country": "hungary"},
        {"name": "Signed", "country": "turkey"},
        {"name": "Camel", "country": "latvia"},
        {"name": "Bio", "country": "england"},
        {"name": "Oslay", "country": "england"},
        {"name": "Sokkada", "country": "netherlands"},
        {"name": "IsraelBril", "country": "israel"},
        {"name": "Jester", "country": "turkey"}
    ]
};

function iterate(data) {
    data.active_members.forEach(e => {
        memberName = e.name;
        country = e.country

        addToRoster(memberName,)
    });
}

function addToRoster(memberName,country,container) {
    elements = '<div class="row mb-3"><div class="col-sm-6"><p class="lead roster-user"><a href="#">'+memberName+'</a></p></div><div class="col-sm-2"><img class="nation-img" src="img/nation/'+country+'.png" alt="england"></div></div>';

    container.innerHTML = elements;
}

iterate(JSON.parse(data))