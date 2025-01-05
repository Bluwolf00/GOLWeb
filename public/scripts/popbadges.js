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

function getAllBadges() {
    fetch('/getBadges')
        .then((response) => response.json())
        .then((data) => {
            console.log(length);
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
        });
}

getAllBadges();

// fetch('/getBadges')
//         .then((response) => response.json())
//         .then((data) => {
//             var length = data.length;
//             var iterations = Math.ceil(length / 3);
//             console.log(length);
//             for (let i = 0; i < iterations; i++) {
//                 const element = data[i];
//                 badgeName = element.badgeName;
//                 badgeDescription = element.badgeDescription;
//                 if (element.badgePath === null) {
//                     element.badgePath = '';
//                 }
//                 badgePath = element.badgePath;
//                 createCard(badgeName, badgeDescription, badgePath);
//                 console.log(badgeName);
//             };
//         });