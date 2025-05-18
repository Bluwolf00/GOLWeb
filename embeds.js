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
        
                if (desc.includes("Mission Name:")) {
                    missionName = desc.substring(desc.indexOf("Mission Name:") + 13, desc.indexOf("\n", desc.indexOf("Mission Name:")));
                } else if (desc.includes("#")) {
                    missionName = desc.substring(desc.indexOf("#") + 1, desc.indexOf("\n", desc.indexOf("#")));
                } else if (desc.includes("TBA")) {
                    missionName = "TBA";
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
    
            if (desc.includes("Training:")) {
                trainingName = desc.substring(desc.indexOf("Training:") + 9, desc.indexOf("\n", desc.indexOf("Training:")));
            } else if (desc.includes("TBA")) {
                trainingName = "TBA";
            }

            if (trainingName == undefined) {
                trainingName = "TBA";
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

module.exports = { getInfoFromAPI, addVideosDuration, getMemberAttendanceFromAPI: getAttendanceFromAPI, getNextMission, getNextTraining };