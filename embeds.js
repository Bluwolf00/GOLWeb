const dotenv = require('dotenv');
dotenv.config()

async function getInfoFromAPI() {
    console.log("FETCHING FROM API...");

    // Prepare variables
    var data;
    var savedVideos = [];

    // Channels to fetch videos from
    channels = ['UCuKMp2KWhQ69geXACQ0jf5A', 'UCTw6PJb5bCrsVPAVRUc-eTA'];

    // Loop through all channels
    for (var i = 0; i < channels.length; i++) {
        var response = await fetch('https://www.googleapis.com/youtube/v3/search?&part=snippet&order=date&channelId=' + channels[i] + '&maxResults=2&key=' + process.env.YOUTUBE_API_KEY, {
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

            var videoObj = {
                title: videos[j].snippet.title,
                thumbnail: videos[j].snippet.thumbnails.medium.url,
                videoId: videos[j].id.videoId,
                author: videos[j].snippet.channelTitle,
                url: 'https://www.youtube.com/watch?v=' + videos[j].id.videoId,
                duration: "",
                publishedAt: videos[j].snippet.publishedAt
            };

            savedVideos.push(videoObj);
        };
    }

    // Sort the videos by date
    savedVideos.sort((a, b) => {
        return new Date(b.publishedAt) - new Date(a.publishedAt);        
    });

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
    
        var index = json.items[0].contentDetails.duration.indexOf('M');
    
        videos.video1.duration = parseInt(json.items[0].contentDetails.duration.substring(2, index)) * 60;
        videos.video2.duration = parseInt(json.items[1].contentDetails.duration.substring(2, index)) * 60;
        videos.video3.duration = parseInt(json.items[2].contentDetails.duration.substring(2, index)) * 60;
        
    } catch (error) {
        videos = error;
    } finally {
        return videos;
    }
}

module.exports = { getInfoFromAPI, addVideosDuration };