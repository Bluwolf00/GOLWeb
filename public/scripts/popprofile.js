var nameEle = document.getElementById('playerName');
var countryEle = document.getElementById('playerCountry');
var statusEle = document.getElementById('playerStatus');
var joinedEle = document.getElementById('playerJoin');
var rankEle = document.getElementById('playerRank');
var promoEle = document.getElementById('playerPromotion');
var profileImg = document.getElementById('profileImg');
var rankImg = document.getElementById('rankImg');

var playerName = "";
var playerCountry = "";
var playerStatus = "";
var playerJoin = "";
var playerRank = "";
var playerPromotion = "";
var countryPath = "";
var rankPath = "";

// This function is used to update the user profile information for the profile page
function updateProfile() {
    nameEle.innerText = playerName;
    countryEle.innerText = playerCountry;
    statusEle.innerText = playerStatus;
    joinedEle.innerText = playerJoin;
    rankEle.innerText = playerRank;
    promoEle.innerText = playerPromotion;
    profileImg.src = countryPath;
    rankImg.src = rankPath;
}

// This function is used to get the user profile information for the profile page and display it
function getProfile() {
    var url = window.location.href;
    var id = url.substring(url.lastIndexOf('=') + 1);
    // console.log(id);
    fetch('/memberinfo?name=' + id)
        .then((response) => response.json())
        .then(([data]) => {
            // console.log(data);
            playerName = data.UName;
            playerCountry = data.Country;
            playerStatus = data.status;
            playerRank = data.rankName;
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

            // Parse the country and rank paths
            countryPath = 'img/nation/' + data.Country.toLowerCase() + '.png';
            rankPath = data.rankPath;
            updateProfile();
        });
}

// This function is used to get the user badges for the profile page and display them
function getBadges() {
    var url = window.location.href;
    var id = url.substring(url.lastIndexOf('=') + 1);
    fetch('/memberbadges?name=' + id)
        .then((response) => response.json())
        .then(([data]) => {
            var dataLength = data.length;

            var repeats = Math.ceil(dataLength / 4);

            var badgeDiv = document.getElementById('badgeDiv');;

            let counter = 0;
            let qualFlag = false;
            for (const badge of data) {
                if (badge.isQualification === 1 && !qualFlag) {
                    badgeDiv = document.getElementById('qualDiv');
                    qualFlag = true;
                    counter = 0;
                }
                if (counter % 4 === 0) {
                    var badgeRow = document.createElement('div');
                    badgeRow.className = 'row';
                    badgeDiv.appendChild(badgeRow);
                    var badgeCols = [];
                    for (let i = 0; i < 4; i++) {
                        badgeCols.push(document.createElement('div'));
                        badgeRow.appendChild(badgeCols[i]);
                        badgeCols[i].className = 'col';
                    }
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
            console.log(data);
        });
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