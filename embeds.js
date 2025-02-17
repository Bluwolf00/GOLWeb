const dotenv = require('dotenv');
const request = require('request');
dotenv.config()

async function getInfoFromAPI() {
    try {
        request.get('https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=3&channelId=UCuKMp2KWhQ69geXACQ0jf5A&key=' + process.env.YOUTUBE_API_KEY, (error, response, body) => {
            if (error) {
                console.log(error);
            }
            var json = JSON.parse(body);
            var videos = json.items;

            var savedVideos = {
                video1: {
                    title: videos[0].snippet.title,
                    thumbnail: videos[0].snippet.thumbnails.medium.url,
                    videoId: videos[0].id.videoId,
                    url: 'https://www.youtube.com/watch?v=' + videos[0].id.videoId,
                    duration: ""
                },
                video2: {
                    title: videos[1].snippet.title,
                    thumbnail: videos[1].snippet.thumbnails.medium.url,
                    videoId: videos[1].id.videoId,
                    url: 'https://www.youtube.com/watch?v=' + videos[1].id.videoId,
                    duration: ""
                },
                video3: {
                    title: videos[2].snippet.title,
                    thumbnail: videos[2].snippet.thumbnails.medium.url,
                    videoId: videos[2].id.videoId,
                    url: 'https://www.youtube.com/watch?v=' + videos[2].id.videoId,
                    duration: ""
                }
            };

            return savedVideos;
        });
    } catch (error) {
        
    }
}

async function addVideosDuration(videos) {
    videoIds = videos.video1.videoId + ',' + videos.video2.videoId + ',' + videos.video3.videoId;
    try {
        request.get('https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=' + videoIds + '&key=' + process.env.YOUTUBE_API_KEY, (error, response, body) => {
            if (error) {
                console.log(error);
            }
            var json = JSON.parse(body);
            
            videos.video1.duration = json.items[0].contentDetails.duration;
            videos.video2.duration = json.items[1].contentDetails.duration;
            videos.video3.duration = json.items[2].contentDetails.duration;

            return videos;
        });
    } catch (error) {
        
    }
}

module.exports = { getInfoFromAPI, addVideosDuration };