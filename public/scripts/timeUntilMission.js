function updateTimeUntilMission() {
    const timeUntilMission = document.getElementById('timeUntilMission');
    const now = new Date();
    // const nextMissionTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 18, 0, 0); // Example: 6 PM today

    // Calculate the time until the next mission
    // This is either Sunday at 5 PM or Thursday at 7 PM
    let nextMissionTime;
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

    // If today is either Monday through Wednesday, set the next mission to Thursday at 7 PM
    if (dayOfWeek > 0 && dayOfWeek < 4) {
        nextMissionTime = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (4 - dayOfWeek), 19, 0,
            0); // Thursday at 7 PM
    } else if (dayOfWeek === 0 || dayOfWeek > 4) {

        // If it's past 5 PM on Sunday, set the next mission to the next Thursday at 7 PM
        if (dayOfWeek === 0 && now.getHours() >= 17) {
            nextMissionTime = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (4), 19, 0,
                0); // Thursday at 7 PM
        } else {
            // If today is Sunday, set the next mission to today at 5 PM
            if (dayOfWeek === 0) {
                nextMissionTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 17,
                    0, 0); // Today at 5 PM
            } else {
                // If today is Saturday or Friday set the next mission to the next Sunday at 5 PM
                nextMissionTime = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (7 - dayOfWeek), 17,
                    0, 0); // Sunday at 5 PM
            }
        }
    } else {
        // If today is Thursday and is past 7 PM, set the next mission to the next Sunday at 5 PM
        if (now.getHours() >= 19) {
            nextMissionTime = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (7 - dayOfWeek), 17,
                0, 0); // Next Sunday at 5 PM
        } else {
            nextMissionTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 19, 0,
                0); // Today at 7 PM
        }
    }

    // 

    const timeDiff = nextMissionTime - now;
    const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(timeDiff / (1000 * 60 * 60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

    if (days === 0) {
        timeUntilMission.textContent = `T- ${hours}h ${minutes}m ${seconds}s`;
    } else {
        timeUntilMission.textContent = `T- ${days}d ${hours % 24}h ${minutes}m ${seconds}s`;
    }
}