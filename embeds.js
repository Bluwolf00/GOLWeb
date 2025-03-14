const dotenv = require('dotenv');
dotenv.config()

async function getInfoFromAPI() {
    console.log("FETCHING FROM API...");

    var response = await fetch('https://www.googleapis.com/youtube/v3/search?&part=snippet&order=date&channelId=UCuKMp2KWhQ69geXACQ0jf5A&maxResults=3&key=' + process.env.YOUTUBE_API_KEY, {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }
    });

    var data = await response.json();
    var videos = data.items;

    var savedVideos = {
        video1: {
            title: videos[0].snippet.title,
            thumbnail: videos[0].snippet.thumbnails.medium.url,
            videoId: videos[0].id.videoId,
            author: videos[0].snippet.channelTitle,
            url: 'https://www.youtube.com/watch?v=' + videos[0].id.videoId,
            duration: ""
        },
        video2: {
            title: videos[1].snippet.title,
            thumbnail: videos[1].snippet.thumbnails.medium.url,
            videoId: videos[1].id.videoId,
            author: videos[1].snippet.channelTitle,
            url: 'https://www.youtube.com/watch?v=' + videos[1].id.videoId,
            duration: ""
        },
        video3: {
            title: videos[2].snippet.title,
            thumbnail: videos[2].snippet.thumbnails.medium.url,
            videoId: videos[2].id.videoId,
            author: videos[2].snippet.channelTitle,
            url: 'https://www.youtube.com/watch?v=' + videos[2].id.videoId,
            duration: ""
        }
    };
    return savedVideos;

}

async function addVideosDuration(videos) {
    var videoIds = videos.video1.videoId + ',' + videos.video2.videoId + ',' + videos.video3.videoId;
    var response = await fetch('https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=' + videoIds + '&key=' + process.env.YOUTUBE_API_KEY)
    var json = await response.json();

    var index = json.items[0].contentDetails.duration.indexOf('M');

    videos.video1.duration = parseInt(json.items[0].contentDetails.duration.substring(2, index)) * 60;
    videos.video2.duration = parseInt(json.items[1].contentDetails.duration.substring(2, index)) * 60;
    videos.video3.duration = parseInt(json.items[2].contentDetails.duration.substring(2, index)) * 60;
    

    return videos;
}

module.exports = { getInfoFromAPI, addVideosDuration };