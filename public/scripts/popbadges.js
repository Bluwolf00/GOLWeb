var badgeName = "";
var badgeDescription = "";
var badgePath = "";

function createCard(name, description, path) {
    var parentDiv = document.getElementById('badgeDiv');
    var col = document.createElement('div');
    col.className = 'col';
    parentDiv.appendChild(col);
    var card = document.createElement('div');
    card.className = 'card h-100';
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
        createCard(badgeName, badgeDescription, badgePath);
        console.log(badgeName);
    });
}

getAllBadges();