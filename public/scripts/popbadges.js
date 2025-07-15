var badgeName = "";
var badgeDescription = "";
var badgePath = "";

function createCard(name, description, path, isQuali) {
    var parentDiv = document.getElementById('badgeDiv');
    var col = document.createElement('div');
    col.className = 'col hidden';
    parentDiv.appendChild(col);
    var card = document.createElement('div');
    if (isQuali) {
        card.className = 'card h-100 card-qualif';
    } else {
        card.className = 'card h-100 card-ribbon';
    }
    // card.className = 'card h-100';
    col.appendChild(card);
    var cardImage = document.createElement('img');
    cardImage.className = 'card-img-top';
    cardImage.src = path;
    card.appendChild(cardImage);
    var cardBody = document.createElement('div');
    cardBody.className = 'card-body';
    card.appendChild(cardBody);
    var cardTitle = document.createElement('h5');

    cardTitle.className = 'card-title';
    cardTitle.innerHTML = name;
    cardBody.appendChild(cardTitle);

    var cardText = document.createElement('p');
    cardText.className = 'card-text';
    cardText.innerHTML = description;
    cardBody.appendChild(cardText);
}

async function getAllBadges() {

    var response = await fetch('/data/getBadges');
    var data = await response.json();

    data.forEach(badge => {
        badgeName = badge.badgeName;
        badgeDescription = badge.badgeDescription;
        if (badge.badgePath === null || badge.badgePath === '') {
            badge.badgePath = 'img/badge/Placeholder_Badge.png';
        }
        badgePath = badge.badgePath;
        isQuali = badge.isQualification;
        createCard(badgeName, badgeDescription, badgePath, isQuali);
        console.log(badgeName);
    });
}

function observerFunc() {
    // Load the observer script
    var observerScript = document.createElement('script');
    observerScript.defer = true;
    observerScript.src = '/scripts/observer.js';
    document.body.appendChild(observerScript);
}

getAllBadges();
observerFunc();
