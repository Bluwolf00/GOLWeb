const dotenv = require('dotenv');
dotenv.config()

async function getInfoFromAPI() {
    console.log("FETCHING FROM API...");

    // Prepare variables
    var data;
    var savedVideos = [];

    // Channels to fetch videos from
    // No these are not sensitive, they are public channels
    channels = ['UCuKMp2KWhQ69geXACQ0jf5A', 'UCTw6PJb5bCrsVPAVRUc-eTA'];

    // Loop through all channels
    for (var i = 0; i < channels.length; i++) {
        var response = await fetch('https://www.googleapis.com/youtube/v3/search?&part=snippet&order=date&channelId=' + channels[i] + '&maxResults=8&key=' + process.env.YOUTUBE_API_KEY, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        // Convert response to JSON
        data = await response.json();
        var videos = data.items;

        // Create an array of objects with the video information
        for (var j = 0; j < videos.length; j++) {

            var videoObj = {}


            // console.log("Video Title: " + videos[j].snippet.title);
            // console.log("Is ArmA Video: " + (videos[j].snippet.title.search(/Arma/i) > -1));

            if (videos[j].snippet.title.search(/Arma/i) > -1) {
                // If the video is an Arma video, add it to the array
                videoObj = {
                    title: videos[j].snippet.title,
                    thumbnail: videos[j].snippet.thumbnails.medium.url,
                    videoId: videos[j].id.videoId,
                    author: videos[j].snippet.channelTitle,
                    url: 'https://www.youtube.com/watch?v=' + videos[j].id.videoId,
                    duration: "",
                    publishedAt: videos[j].snippet.publishedAt
                };
            } else {
                // If the video is not an Arma video, skip it
                continue;
            }


            savedVideos.push(videoObj);
        };
    }

    // Sort the videos by date
    savedVideos.sort((a, b) => {
        return new Date(b.publishedAt) - new Date(a.publishedAt);
    });

    savedVideos = savedVideos.slice(0, 3);

    console.log("FETCHED FROM API");

    var parsedVideos = {};

    // Create a dictionary from the array
    for (var i = 0; i < savedVideos.length; i++) {
        parsedVideos = {
            video1: savedVideos[0],
            video2: savedVideos[1],
            video3: savedVideos[2]
        }
    }

    return parsedVideos;
}

// Add the duration of the videos to the object
// This is a separate function because the API call is different
async function addVideosDuration(videos) {

    try {
        var videoIds = videos.video1.videoId + ',' + videos.video2.videoId + ',' + videos.video3.videoId;
        var response = await fetch('https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=' + videoIds + '&key=' + process.env.YOUTUBE_API_KEY)
        var json = await response.json();
        var indexes = [];
        var durations = [];


        // Find the duration in minutes, if the duration is shorter than a minute, it will be in seconds
        // This is caused by the API returning the duration in PT#M#S format
        for (let i = 0; i < 3; i++) {
            indexes[i] = json.items[i].contentDetails.duration.indexOf('M');
            durations[i] = parseInt(json.items[i].contentDetails.duration.substring(2, indexes[i])) * 60;
            if (indexes[i] == -1) {
                indexes[i] = json.items[i].contentDetails.duration.indexOf('S');
                durations[i] = parseInt(json.items[i].contentDetails.duration.substring(2, indexes[i]));
            }
        }

        videos.video1.duration = durations[0];
        videos.video2.duration = durations[1];
        videos.video3.duration = durations[2];
    } catch (error) {
        videos = error;
    } finally {
        return videos;
    }
}

// This function fetches the attendance data from the Raid Helper API - This is used to display the number of events each member has attended
// The main tag is used to only get the attendance data for the main events
// Further filtering can be done by including tags for each thursday and sunday event
async function getAttendanceFromAPI() {
    var response;
    var data;
    var attendanceArray = [];

    try {
        response = await fetch(`https://raid-helper.dev/api/v2/servers/${process.env.RAID_HELPER_SERVER_ID}/attendance`, {
            method: 'GET',
            headers: {
                'TagFilter': 'main',
                'Content-Type': 'application/json',
                'Authorization': `${process.env.OPORD_API_KEY}`
            }
        });
        data = await response.json();
        attendanceArray = data.result;

    } catch (error) {
        return error;
    }

    // console.log("API: " + attendanceArray);

    // Returns an array of objects containing the member's name and the number of events they have attended
    return attendanceArray;
}

async function getMemberLOAsFromAPI() {
    var response;
    var data;
    var LOAArray = [];
    var memberId;
    var startDate;
    var endDate;

    try {
        response = await fetch(`https://discord.com/api/v8/channels/${process.env.DISCORD_CHANNEL_ID}/messages?after=863674396770172969`, {
            method: 'GET',
            headers: {
                authorization: `${process.env.DISCORD_BOT_TOKEN}`,
            }
        });

        data = await response.json();

        console.log("Data: " + data);

        // data = testJSON;
        var startPos;
        var endPos;

        for (var i = 0; i < data.length; i++) {

            // Ensure that the message is in the format we expect
            console.log("Message: " + data[i].content);
            console.log("Does Message include From: " + data[i].content.includes("From"));
            if (data[i].content.includes("From")) {

                startPos = data[i].content.indexOf("From") + 6;

                // Check which word is used to end the date
                if (data[i].content.includes("Until")) {
                    endPos = data[i].content.indexOf("Until") - 1;
                    startDate = data[i].content.substring(startPos, endPos);
                    endDate = data[i].content.substring(endPos + 8, data[i].content.indexOf("\n", endPos + 1));
                } else {
                    endPos = data[i].content.indexOf("To") - 1;
                    startDate = data[i].content.substring(startPos, endPos);
                    endDate = data[i].content.substring(endPos + 5, data[i].content.indexOf("\n", endPos + 1));
                }
                startDate = startDate.replace(/(\d+)(st|nd|rd|th)/, '$1');
                endDate = endDate.replace(/(\d+)(st|nd|rd|th)/, '$1');

                // Trim the date to remove any whitespace
                startDate.trim();
                endDate.trim();

                // If the day does not have a leading zero, add it
                if (parseInt(startDate.substring(0, 3)) < 10) {
                    startDate = "0" + startDate;
                }
                if (parseInt(endDate.substring(0, 3)) < 10) {
                    endDate = "0" + endDate;
                }

                // If the year is not included, add the current year
                var year = new Date().getFullYear();
                if (!startDate.includes(year)) {
                    startDate = startDate + " " + year;
                }
                if (!endDate.includes(year)) {
                    endDate = endDate + " " + year;
                }

                // If the month is the full name, convert it to the 3 letter abbreviation
                startDate = startDate.replace(/January/g, "Jan").replace(/February/g, "Feb").replace(/March/g, "Mar").replace(/April/g, "Apr").replace(/May/g, "May").replace(/June/g, "Jun").replace(/July/g, "Jul").replace(/August/g, "Aug").replace(/September/g, "Sep").replace(/October/g, "Oct").replace(/November/g, "Nov").replace(/December/g, "Dec");
                endDate = endDate.replace(/January/g, "Jan").replace(/February/g, "Feb").replace(/March/g, "Mar").replace(/April/g, "Apr").replace(/May/g, "May").replace(/June/g, "Jun").replace(/July/g, "Jul").replace(/August/g, "Aug").replace(/September/g, "Sep").replace(/October/g, "Oct").replace(/November/g, "Nov").replace(/December/g, "Dec");

                // Remove any special characters from the date
                startDate = startDate.replace(/[^a-zA-Z0-9 ]/g, "");
                endDate = endDate.replace(/[^a-zA-Z0-9 ]/g, "");

                // Get the member ID from the JSON
                // If entered manuually, get the member ID from the message
                // If the message is from the member, get the member ID from the message
                if (data[i].content.includes("Member")) {
                    memberId = data[i].content.substring(data[i].content.indexOf("Member") + 7, data[i].content.indexOf("\n", data[i].content.indexOf("Member") + 7));
                } else {
                    memberId = data[i].author.id;
                }

                console.log("Start Date: " + startDate);
                console.log("End Date: " + endDate);
                console.log("Member ID: " + memberId);

                // Set the dates to UNIX time
                startDate = Date.parse(startDate);
                endDate = Date.parse(endDate);

                LOAArray.push({
                    memberId: memberId,
                    startDate: startDate,
                    endDate: endDate
                });
            }
        }

    } catch (err) {
        console.log(err);

        LOAArray.push({
            memberId: "Error",
            startDate: "Error",
            endDate: "Error"
        });
    } finally {
        return LOAArray;
    }
}

// 2024-01-01 - 1704135000
// 2024-12-31 - 1735671000
// 2023-12-31 - 1704048600
// 2023-01-01 - 1672599000
// 2022-12-31 - 1672512600
// 2022-01-01 - 1641063000

async function getAttendanceReport() {
    var response = await fetch(`https://raid-helper.dev/api/v3/servers/${process.env.RAID_HELPER_SERVER_ID}/events`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `${process.env.OPORD_API_KEY}`,
            'ChannelFilter': '862784206513766400',
            'IncludeSignUps': 'true',
            'StartTimeFilter': '',
            'EndTimeFilter': ''
        }
    });
    var data = await response.json();

    eventArray = data.postedEvents;

    var attendanceReport = [];
    var thursdays = [];
    var sundays = [];
    var memberDiscordId;
    var dayofWeek;
    var attended;
    var numberOfCancelledEvents = 0;

    for (var i = 0; i < eventArray.length; i++) {
        // Get the day of the week from the event date
        // console.log(eventArray[i].startTime);
        var date = new Date(eventArray[i].startTime * 1000);
        dayofWeek = date.getDay();

        // If the event is not cancelled and has started, check if the members attended
        if (!(eventArray[i].description).toLowerCase().includes("cancelled") && !(eventArray[i].title).toLowerCase().includes("cancel")) {
            // If the event has already started or finished, check if the members attended
            if (parseInt(eventArray[i].startTime) < parseInt(Date.now() / 1000)) {

                for (var j = 0; j < eventArray[i].signUps.length; j++) {
                    if (!(eventArray[i].signUps[j].specName == "Declined" || eventArray[i].signUps[j].specName == "Absence")) {
                        attended = true;
                        memberDiscordId = eventArray[i].signUps[j].userId;
                        if (dayofWeek == 4) {
                            thursdays.push(memberDiscordId);
                        } else if (dayofWeek == 0) {
                            sundays.push(memberDiscordId);
                        }
                    }
                }
            } else {
                // console.log("Event has not started yet, skipping...");
            }
        } else {
            // console.log("Event cancelled, skipping...");
            numberOfCancelledEvents++;
        }
    }

    // Count the number of times each member has attended on Thursdays and Sundays
    var thursdaysCount = {};
    var sundaysCount = {};

    for (var i = 0; i < thursdays.length; i++) {
        if (thursdaysCount[thursdays[i]]) {
            thursdaysCount[thursdays[i]]++;
        } else {
            thursdaysCount[thursdays[i]] = 1;
        }
    }

    for (var i = 0; i < sundays.length; i++) {
        if (sundaysCount[sundays[i]]) {
            sundaysCount[sundays[i]]++;
        } else {
            sundaysCount[sundays[i]] = 1;
        }
    }

    // Create the attendance report
    for (var i = 0; i < eventArray.length; i++) {
        for (var j = 0; j < eventArray[i].signUps.length; j++) {
            memberDiscordId = eventArray[i].signUps[j].userId;
            if (eventArray[i].signUps[j].specName == "Accepted" || eventArray[i].signUps[j].specName == "Both" || eventArray[i].signUps[j].specName == "Training") {
                if (thursdaysCount[memberDiscordId] && sundaysCount[memberDiscordId]) {
                    attendanceReport.push({
                        memberDiscordId: memberDiscordId,
                        memberName: eventArray[i].signUps[j].name.substring((eventArray[i].signUps[j].name.indexOf(".") + 1), eventArray[i].signUps[j].name.length),
                        thursdays: thursdaysCount[memberDiscordId],
                        sundays: sundaysCount[memberDiscordId]
                    });
                } else if (sundaysCount[memberDiscordId]) {
                    attendanceReport.push({
                        memberDiscordId: memberDiscordId,
                        memberName: eventArray[i].signUps[j].name.substring((eventArray[i].signUps[j].name.indexOf(".") + 1), eventArray[i].signUps[j].name.length),
                        thursdays: 0,
                        sundays: sundaysCount[memberDiscordId]
                    });
                } else if (thursdaysCount[memberDiscordId]) {
                    attendanceReport.push({
                        memberDiscordId: memberDiscordId,
                        memberName: eventArray[i].signUps[j].name.substring((eventArray[i].signUps[j].name.indexOf(".") + 1), eventArray[i].signUps[j].name.length),
                        thursdays: thursdaysCount[memberDiscordId],
                        sundays: 0
                    });
                } else {
                    attendanceReport.push({
                        memberDiscordId: memberDiscordId,
                        memberName: eventArray[i].signUps[j].name.substring(eventArray[i].signUps[j].name.indexOf("."), (eventArray[i].signUps[j].name.length - 1)),
                        thursdays: 0,
                        sundays: 0
                    });
                }
            }
        }
    }
    // Remove duplicates from the attendance report
    attendanceReport = attendanceReport.filter((value, index, self) =>
        index === self.findIndex((t) => (
            t.memberDiscordId === value.memberDiscordId
        ))
    );

    console.log("-- Attendance Report Complete --");

    return attendanceReport;
}
async function getScheduledEvents() {
    var data;
    try {
        response = await fetch(`https://raid-helper.dev/api/v3/servers/${process.env.RAID_HELPER_SERVER_ID}/events`, {
            method: 'GET',
            headers: {
                'TagFilter': 'main',
                'Content-Type': 'application/json',
                'Authorization': `${process.env.OPORD_API_KEY}`,
                'StartTimeFilter': new Date().toISOString()
            }
        });
        data = await response.json();
    } catch (error) {
        data = error;
    } finally {
        return data;
    }
}

async function getNextMission() {
    var data;
    var nextMission = {};

    try {
        data = await getScheduledEvents();
        for (var i = 0; i < data.postedEvents.length; i++) {
            if (data.postedEvents[i].title.includes("THURSDAY OPERATION") || data.postedEvents[i].title.includes("SUNDAY OPERATION")) {
                var desc = data.postedEvents[0].description;
                var missionName;
                var missionPartOfDesc = desc.substring(desc.indexOf("Mission"));

                // TODO - Clean up the code to differentiate between Sundays and Thursdays formatting

                if (missionPartOfDesc.includes("TBA")) {
                    missionName = "TBA";
                } else {
                    if (desc.includes("Mission Name:")) {
                        missionName = desc.substring(desc.indexOf("Mission Name:") + 13, desc.indexOf("\n", desc.indexOf("Mission Name:")));
                    } else if (desc.includes("Mission Details:")) {
                        missionName = desc.substring(desc.indexOf("Mission Name:") + 16, desc.indexOf("\n", desc.indexOf("Mission Name:")));
                    } else if (desc.includes("#")) {
                        missionName = desc.substring(desc.indexOf("#") + 1, desc.indexOf("\n", desc.indexOf("#")));
                    } else if (desc.includes("TBA")) {
                        missionName = "TBA";
                    }
                }
        

                nextMission = {
                    name: missionName,
                    date: data.postedEvents[i].startTime,
                    description: desc,
                    eventId: data.postedEvents[i].id
                };

                break;
            }
        }
        
    } catch (error) {
        return error;
    }

    // console.log("API: " + attendanceArray);

    // Returns an array of objects containing the member's name and the number of events they have attended
    return nextMission;
}

async function getNextTraining() {
    var data;
    var nextTraining = {};

    data = await getScheduledEvents();

    for (var i = 0; i < data.postedEvents.length; i++) {
        if (data.postedEvents[i].title.includes("THURSDAY OPERATION")) {
            var desc = data.postedEvents[0].description;
            var trainingName;
            var trainingPartOfDesc = desc.substring(0, desc.indexOf("Mission"));

            // If the description of the event includes the word "TBA" anywhere in the Training section of the description, set the training name to "TBA"
            // This is done to avoid the case where the MISSION name is TBA, but the training name is not
            if (trainingPartOfDesc.includes("TBA")) {
                trainingName = "TBA";
            } else {
                // Get the training name from the description
                trainingName = desc.substring(desc.indexOf("Training:") + 9, desc.indexOf("\n", desc.indexOf("Training:")));

                if (trainingName == "undefined") {
                    trainingName = "TBA";
                }
    
            }
            nextTraining = {
                name: trainingName,
                date: data.postedEvents[i].startTime,
                description: desc,
                eventId: data.postedEvents[i].id
            };

            break;
        }
    }

    return nextTraining;
}

module.exports = { getInfoFromAPI, addVideosDuration, getMemberAttendanceFromAPI: getAttendanceFromAPI, getNextMission, getNextTraining, getMemberLOAsFromAPI, getAttendanceReport };
