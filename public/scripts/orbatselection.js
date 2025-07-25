async function init() {
    // Fetch the logged in user's role in the next mission
    var success = false;
    try {
        var res = await fetch('/data/getMemberLiveOrbatInfo');
        if (res.status !== 200) {
            console.error("Failed to fetch live ORBAT data");
            return;
        } else {
            success = true;
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
        var composition = data.composition || "Not Confirmed";
    
        document.getElementById("pickedRole").innerHTML = role;
        document.getElementById("pickedComp").innerHTML = composition;        
    } catch (error) {
        console.error("Error fetching live ORBAT data:", error);
        return;
    } finally {
        if (!success) {
            document.querySelectorAll(".selection-option").forEach(option => {
                option.classList.add("disabled-option");
            });

            let cont = document.getElementById("slotSelectionContainer");

            let newRow = document.createElement("div");
            newRow.classList.add("row", "justify-content-center", "mt-5");
            let newCol = document.createElement("div");
            newCol.classList.add("col-12", "text-center");

            newCol.innerHTML = "<h2 class='lead' style='color: var(--blu-secondary); font-size: 2.25rem'>No ORBAT Released</h2><p class='lead' style='font-size: 1.25rem'>Please check back later for updates.</p>";
            newRow.appendChild(newCol);
            cont.appendChild(newRow);
        }
    }

}

init();