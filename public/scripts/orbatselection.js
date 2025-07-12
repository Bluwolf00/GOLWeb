async function init() {
    // Fetch the logged in user's role in the next mission
    try {
        var res = await fetch('/data/getMemberLiveOrbatInfo');
        if (res.status !== 200) {
            console.error("Failed to fetch live ORBAT data");
            return;
        }
        var data = await res.json();
        if (!data || data.length === 0) {
            console.error("No live ORBAT data found");
            return;
        }

        // Update the role and composition based on the fetched data
        var role;

        if (data.memberRole && data.memberCallsign) {
            role = data.memberCallsign + " : " + data.memberRole;
        } else {
            role = "Unconfirmed";
        }
        var composition = data.composition || "Unconfirmed";
    
        document.getElementById("pickedRole").innerHTML = role;
        document.getElementById("pickedComp").innerHTML = composition;        
    } catch (error) {
        console.error("Error fetching live ORBAT data:", error);
        return;
    }

}

init();