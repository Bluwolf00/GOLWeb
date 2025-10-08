var nameEle = document.getElementById('playerName');
var countryEle = document.getElementById('playerCountry');
var statusEle = document.getElementById('playerStatus');
var joinedEle = document.getElementById('playerJoin');
var rankEle = document.getElementById('playerRank');
var promoEle = document.getElementById('playerPromotion');
var eventsEle = document.getElementById('playerEvents');
var profileImg = document.getElementById('profileImg');
var rankImg = document.getElementById('rankImg');

var playerName = "";
var playerCountry = "";
var playerStatus = "";
var playerJoin = "";
var playerRank = "";
var playerPromotion = "";
var playerEvents = "";
var countryPath = "";
var rankPath = "";

let admin = isloggedIn;

async function updateElement(element, value) {
    switch (element) {
        case 'name':
            nameEle.innerText = value;
            break;
        case 'country':
            countryEle.innerText = value;
            break;
        case 'status':
            statusEle.innerText = value;
            if (playerStatus === 'Pending Promotion') {
                statusEle.parentElement.style.backgroundColor = 'rgb(0, 91, 119)';
                eventsEle.parentElement.style.backgroundColor = 'rgb(0, 91, 119)';
            };
            break;
        case 'joined':
            joinedEle.innerText = value;
            break;
        case 'rank':
            rankEle.innerText = value;
            break;
        case 'promo':
            promoEle.innerText = value;
            break;
        case 'events':
            eventsEle.innerText = value;
            break;
        case 'profileImg':
            profileImg.src = value;
            break;
        case 'rankImg':
            rankImg.src = value;
            break;
        case 'lastEvent':
            daysSinceLastDeploymentEle = document.getElementById('daysSinceLastDeployment');
            daysSinceLastDeploymentEle.innerText = value;
            break;
        default:
            console.log('Invalid element: ' + element);
            break;
    }
}

// This function is used to update the user profile information for the profile page
async function updateProfile() {

    if (admin) {
        var promoteDropdown = document.getElementById('promo-content');
        var demoteDropdown = document.getElementById('demo-content');

        var ranksAbove = await getRanks('above', playerRank);

        ranksAbove = ranksAbove[0];
        ranksAbove = ranksAbove[0];

        // console.log(ranksAbove);

        ranksAbove.forEach(rank => {
            var tempElement = document.createElement('a');
            tempElement.href = '#';
            tempElement.innerText = rank.prefix;
            tempElement.name = rank.prefix;

            tempElement.addEventListener('click', function () {
                popUp('promote', playerRank, rank.prefix, admin);
            });

            promoteDropdown.appendChild(tempElement);
        });

        var buttonDivs = document.getElementById('promoteButton');

        buttonDivs.addEventListener('click', function () {
            var firstChild = ranksAbove[0];
            popUp('promote', playerRank, firstChild.prefix, admin);
        });

        var ranksBelow = await getRanks('below', playerRank);

        ranksBelow = ranksBelow[0];
        ranksBelow = ranksBelow[0];

        ranksBelow.forEach(rank => {
            var tempElement = document.createElement('a');
            tempElement.href = '#';
            tempElement.innerText = rank.prefix;
            tempElement.name = rank.prefix;

            tempElement.addEventListener('click', function () {
                popUp('demote', playerRank, rank.prefix, admin);
            });

            demoteDropdown.appendChild(tempElement);
        });

        var demoteButton = document.getElementById('demoteButton');

        demoteButton.addEventListener('click', function () {
            var firstChild = ranksBelow[0];
            popUp('demote', playerRank, firstChild.prefix, admin);
        });
    } else {
        var buttonDivs = document.getElementsByClassName('buttonDiv');

        for (let i = 0; i < buttonDivs.length; i++) {
            buttonDivs[i].hidden = true;
            for (let j = 0; j < buttonDivs[i].children.length; j++) {
                buttonDivs[i].children[j].hidden = true;
            }
        }

        document.getElementById('extraDiv').hidden = true;

        // Hide the dropdowns

        document.getElementsByClassName('floating-action-button')[0].hidden = true;
        document.getElementsByClassName('floating-action-button')[1].hidden = true;
        document.getElementsByClassName('floating-action-button')[2].hidden = true;
    }
}

// This function is used to get the user profile information for the profile page and display it
async function getProfile() {
    var url = window.location.href;
    var id = url.substring(url.lastIndexOf('=') + 1);
    // console.log(id);

    data = await fetch('/data/memberinfo?name=' + id)
        .then((response) => response.json());
    // console.log(data);
    playerName = data.UName;
    playerCountry = data.Country;
    playerStatus = data.playerStatus;
    playerRank = data.rankName;
    updateElement('name', playerName);
    updateElement('country', playerCountry);
    updateElement('rank', playerRank);

    playerJoin = "";
    playerPromotion = "";
    var years = 0;
    var months = 0;
    var days = 0;

    // Try to get the date of join and promotion, if they are null, set the string to 'Unknown'
    try {
        if (data.DateOfJoin === null) {
            playerJoin = 'Unknown';
        } else {
            years = getYearsBetween(new Date(data.DateOfJoin), new Date());
            months = getMonthsBetween(new Date(data.DateOfJoin), new Date());
            days = getDaysBetween(new Date(data.DateOfJoin), new Date());
            playerJoin = getDateString(years, months, days);
        }

        if (data.DateOfPromo === null) {
            playerPromotion = playerJoin;
        } else {
            years = getYearsBetween(new Date(data.DateOfPromo), new Date());
            months = getMonthsBetween(new Date(data.DateOfPromo), new Date());
            days = getDaysBetween(new Date(data.DateOfPromo), new Date());
            playerPromotion = getDateString(years, months, days);
        }
    } catch (error) {
        console.log('No Date of Join or Promotion: %d', error);
    }

    updateElement('joined', playerJoin);
    updateElement('promo', playerPromotion);

    // Parse the country and rank paths
    countryPath = 'img/nation/' + data.Country.toLowerCase() + '.png';
    rankPath = data.rankPath;
    playerEvents = 0;

    // Update the profile image and rank image
    updateElement('profileImg', countryPath);
    updateElement('rankImg', rankPath);

    // Get the number of events attended by the player
    try {
        response = await fetch('/data/getMemberAttendance?name=' + playerName);
        data = await response.json();

        var lastEventAttended = "N/A";
        if (data.lastEventAttended !== null || typeof data.lastEventAttended === 'undefined') {
            
            // Set lastEventAttended to the number of days since the last event attended
            var now = new Date();
            var lastEventDate = new Date(data.lastEventAttended);
            var daysSinceLastEvent = getDaysBetween(lastEventDate, now);
            lastEventAttended = daysSinceLastEvent + " Days";
        }

        if (data.thursdays === null || typeof data.thursdays !== 'number') { data.thursdays = 0; }
        if (data.sundays === null || typeof data.sundays !== 'number') { data.sundays = 0; }
        playerEvents = data.thursdays + " | " + data.sundays;
    } catch (error) {
        console.log('Error fetching member attendance: %d', error);
        playerEvents = 0;
        return playerEvents;
    }

    // Finally, update the number of events attended
    updateElement('events', playerEvents);

    // If the player has attended more than 4 events and is a recruit, set the status to 'Pending Promotion'
    // This is used to show the player that they are eligible for a promotion
    // This is not a real promotion, just a status change
    if (playerEvents > 4 && playerRank === 'Recruit' ||
        playerEvents > 30 && playerRank === 'Private' ||
        playerEvents > 60 && playerRank === 'Private Second Class'
    ) {
        playerStatus = 'Pending Promotion';
    }

    updateElement('status', playerStatus);
    // updateProfile();

    updateElement('lastEvent', lastEventAttended);

    // Update the title of the page with the player's name
    document.title = "GOL Profile - " + playerName;
}

// This function is used to get the user badges for the profile page and display them
function getBadges() {
    var url = window.location.href;
    var id = url.substring(url.lastIndexOf('=') + 1);
    fetch('/data/memberbadges?name=' + id)
        .then((response) => response.json())
        .then(([data]) => {
            var dataLength = data.length;

            // var repeats = Math.ceil(dataLength / 4);

            var badgeDiv = document.getElementById('badgeDiv');

            let counter = 0;
            let qualFlag = false;
            for (const badge of data) {
                if (badge.isQualification > 0 && !qualFlag) {
                    badgeDiv = document.getElementById('qualDiv');
                    qualFlag = true;
                    counter = 0;
                }
                if (counter % 4 === 0) {
                    var badgeRow = document.createElement('div');
                    badgeRow.className = 'row';
                    var badgeCols = [];
                    for (let i = 0; i < 4; i++) {
                        badgeCols.push(document.createElement('div'));
                        badgeRow.appendChild(badgeCols[i]);
                        badgeCols[i].className = 'col';
                    }
                    badgeDiv.appendChild(badgeRow);
                    counter = 0;
                }
                var badgeImg = document.createElement('img');
                var badgeCap = document.createElement('span');
                badgeImg.src = badge.badgePath;
                badgeImg.alt = badge.badgeName;
                badgeImg.title = badge.badgeName;
                badgeImg.className = 'badgeImg';
                badgeCols[counter].appendChild(badgeImg);
                badgeCols[counter].appendChild(document.createElement('br'));

                badgeCap.innerHTML = badge.badgeName + '<br>' + 'Obtained: ' + (new Date(badge.DateAcquired).toDateString());
                badgeCap.className = 'badgeCap';
                badgeCols[counter].appendChild(badgeCap);

                counter++;
            }
            // console.log(data);
        });
}

async function getRanks(aboveOrBelow, currentRank) {
    var url = window.location.href;
    var id = url.substring(url.lastIndexOf('=') + 1);

    var response = await fetch('/data/getRanks?aboveOrBelow=' + aboveOrBelow + '&currentRank=' + currentRank);

    var data = await response.json();

    return [data];
}

// This function is used to parse the date into a string for the profile page (e.g. 1 Year 2 Months OR 3 Months OR 5 Days)
function getDateString(years, months, days) {
    var result = "";

    // If the player has been a member for less than a year, only display months
    if (years === 0) {
        // If the player has been a member for less than a month, only display days
        if (months > 0) {
            result = months + ' Month';
            // Switch the string to plural if the number is greater than 1
            if (months > 1) {
                result += 's';
            }
        } else {
            result = days + ' Day';
            // Switch the string to plural if the number is greater than 1
            if (days > 1) {
                result += 's';
            }
        }
    } else {
        // If the player has been a member for more than a year, display years and months
        if (months === 0) {
            result = years + ' Year';
            // Switch the string to plural if the number is greater than 1
            if (years > 1) {
                result += 's';
            }
        } else {
            // Add the years to the string
            result = years + ' Year';
            if (years > 1) {
                result += 's';
            }

            // Add the months to the string
            result += ' ' + months + ' Month';
            if (months > 1) {
                result += 's';
            }
        }
    }

    return result;
}

// This function is used to calculate the difference between two dates in years
function getYearsBetween(date1, date2) {
    var diff = date2.getTime() - date1.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

// This function is used to calculate the difference between two dates in months
function getMonthsBetween(date1, date2) {
    var diff = date2.getTime() - date1.getTime();
    var result = Math.floor(diff / (1000 * 60 * 60 * 24 * 30.44));
    return result - (getYearsBetween(date1, date2) * 12);
}

// This function is used to calculate the difference between two dates in days
function getDaysBetween(date1, date2) {
    var diff = date2.getTime() - date1.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
}

getProfile();
getBadges();