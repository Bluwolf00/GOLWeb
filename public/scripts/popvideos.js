function updateVideo(title, duration, description, author, videoId, caseNum) {

    var titleElement = document.getElementById('video-' + caseNum + '-title');
    var durationElement = document.getElementById('video-' + caseNum + '-duration');
    var videoElement = document.getElementById('video-' + caseNum + '-embed');
    var descriptionElement = document.getElementById('video-' + caseNum + '-desc');
    var authorElement = document.getElementById('video-' + caseNum + '-author');
    var buttonElement = document.getElementById('video-' + caseNum + '-button');

    titleElement.innerHTML = title;
    titleElement.href = "https://www.youtube.com/watch?v=" + videoId;
    if (duration > 60) {
        durationElement.innerHTML = (duration / 60) + ' mins';
    } else {
        durationElement.innerHTML = duration + ' secs';
    }
    videoElement.src = "https://www.youtube.com/embed/" + videoId;
    descriptionElement.innerHTML = description;
    authorElement.innerHTML = 'by ' + author;
    buttonElement.href = "https://www.youtube.com/watch?v=" + videoId;
}

async function getAllVideos() {
    var iterations = 1;

    var resp;
    var data;

    try {
        resp = await fetch('/data/getVideos');
        data = await resp.json();
    } catch (error) {
        console.error("Error fetching video data");
        return error;
    }

    data.forEach(video => {

        if (iterations > 3) {
            return;
        }

        videoTitle = video.title;
        videoDescription = video.description;
        videoId = video.videoId;
        videoDuration = video.duration;
        videoAuthor = video.author;

        updateVideo(videoTitle, videoDuration, videoDescription, videoAuthor, videoId, iterations);
        iterations++;
    });
}

getAllVideos();
