// Org Chart from https://github.com/bumbeishvili/org-chart/tree/master

async function createOrg(data, selectedOption = "roles") {
    new d3.OrgChart()
        .nodeUpdate(function (d, i, arr) {
            if (d.data.id == "root") {
                d3.select(this).style('display', 'none');
            }
        })
        .linkUpdate(function (d, i, arr) {
            d3.select(this)
                .attr("stroke", d => d.data._upToTheRootHighlighted ? '#E27396' : '#E4E2E9')
                .attr("stroke-width", d => d.data._upToTheRootHighlighted ? 5 : 1)
            if (d.parent.id == "root") {
                d3.select(this).style('display', 'none');
            }
        })
        .nodeHeight((d) => 85 + 25)
        .nodeWidth((d) => 220 + 2)
        .childrenMargin((d) => 50)
        .compactMarginBetween((d) => 35)
        .compactMarginPair((d) => 30)
        .neighbourMargin((a, b) => 75)
        .compact(true)
        .pagingStep(10)
        .initialExpandLevel(4)
        .nodeContent(function (d, i, arr, state) {
            const color = 'transparent';
            const imageDiffVert = 25 + 2;
            var textcolor = '';
            var nodeColor = '';
            var borderColor = '1px #E4E2E9';
            switch (d.data.roleName) {
                case "Pilot":
                case "Forward Air Controller":
                    nodeColor = 'rgba(0, 132, 255, 0.2)';
                    textcolor = 'rgb(212, 65, 60)';
                    break;

                default:
                    nodeColor = 'rgba(255, 38, 0, 0.2)';
                    textcolor = 'rgb(90, 137, 238)';
                    break;
            }

            var imagePath = "";
            var playerName = d.data.playerName || "Not Assigned";
            var rankPrefix = d.data.rankPrefix || "";
            var classNames = "node-bubble";

            if (rankPrefix !== "") {
                rankPrefix += ". ";
            }

            if (playerName === "Not Assigned") {
                // If the slot is available, add the "available" class
                borderColor = '2px rgba(253, 255, 137, 0.73)';
                classNames += " available";
            }

            switch (d.data.playerName) {
                case undefined:
                    imagePath = "/img/badge/Placeholder_Badge.png";
                    break;

                default:
                    if (d.data.roleName == "Pilot" || d.data.roleName == "Forward Air Controller") {
                        imagePath = "/img/armyaircorps.png";
                    } else {
                        imagePath = "/img/flyinghellfish.png";
                    }
                    break;
            }
            if (d.data.id == "root") {
                return ``;
            }
            return `
                                <div style='width:${d.width}px;height:${d.height}px;padding-top:${imageDiffVert - 2}px;padding-left:1px;padding-right:1px'>
                                    <div class='${classNames}' style="font-family: 'Inter', sans-serif;background-color:${nodeColor};  margin-left:-1px;width:${d.width - 2}px;height:${d.height - imageDiffVert}px;border-radius:10px;border: solid ${borderColor}">
                                        <div class='id-div' style="color:#FFFFFF;display:flex;justify-content:flex-end;margin-top:5px;margin-right:8px">#${d.data.id}</div>
                                        <div style="display:flex;justify-content:flex-end;margin-top:5px">   <img src=${imagePath} style="margin-right:${8}px;border-radius:0px;width:25px;height:25px;" /> </div>
                                        <div style="background-color:${color};margin-top:${-imageDiffVert - 32}px;margin-left:${15}px;border-radius:100px;width:50px;height:50px;" ></div>
                                        <div style="margin-top:${-imageDiffVert - 32}px;">   <img src="/img/logo_new.png" style="margin-left:${20}px;height:40px;" /></div>
                                        <div class='name-div'>${d.data.roleName}</div>
                                        <div style="display:flex;justify-content:space-between;margin-right:10px;">
                                        <div style="color:${textcolor};margin-left:20px;margin-top:3px;font-size:10px;">${d.data.callsign}</div>                
                                        <div class='name-div' style="color:${textcolor};margin-left:20px;margin-top:3px;font-size:10px;">${rankPrefix}${playerName}</div>
                                        </div>
                                        </div></a>
                                    </div>
                                            `;
        })
        .container('.chart-container')
        .data(data)
        .expandAll()
        .render()
        .setCentered("R-0001")
        .render();
}

async function populateMemberDropD() {

    // Default is to populate with the logged in user

    var memberSelect = document.getElementById("memberSelect");

    var loggedInMember = await fetch('/data/getLoggedInUser');

    if (loggedInMember.ok) {
        loggedInMember = await loggedInMember.json();

        // Clear existing options
        memberSelect.innerHTML = "";

        let optionGroup = document.createElement("optgroup");
        optionGroup.label = "Logged In Member";
        var option = document.createElement("option");
        option.value = loggedInMember.memberID;
        option.textContent = loggedInMember.username;
        optionGroup.appendChild(option);
        memberSelect.appendChild(optionGroup);

        if (loggedInMember.role.toLowerCase() === "admin") {
            // If the user is an admin, populate the dropdown with all members
            var allMembers = await fetch('/data/getMembers?order=UNameASC');
            if (allMembers.ok) {
                allMembers = await allMembers.json();
                let optionGroup = document.createElement("optgroup");
                optionGroup.label = "Other Members";
                for (const member of allMembers) {
                    var option = document.createElement("option");
                    option.value = member.MemberID;
                    option.textContent = member.UName;
                    optionGroup.appendChild(option);
                }
                memberSelect.appendChild(optionGroup);
                return; // Exit after populating with all members
            } else {
                console.error("Failed to fetch all members data.");
            }
        }
    } else {
        console.error("Failed to fetch logged in member data.");
    }
}

function createAlert(message, type, form, timeout = -1) {
    var alert = document.createElement("div");
    alert.className = `alert alert-${type} alert-dismissible fade show`;
    alert.role = "alert";
    alert.innerHTML = message +
        '<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>';
    alert.id = "imageAlertMessage";
    if (form === "main") {
        var formEl = document.querySelector("main");
    } else {
        var formEl = document.getElementById(form)
    }
    formEl.prepend(alert);

    if (timeout > 0) {
        setTimeout(function () {
            if (document.getElementById("imageAlertMessage") !== null) {
                $('#imageAlertMessage').alert('close');
            }
        }, timeout);
    }
}

async function handleFormSubmit(event, selectedOption) {

    var formData = new FormData(event.target);
    var memberID = formData.get("selectedMember");
    var roleName = formData.get("chosen_role");
    var slotNodeID = formData.get("chosen_slot");

    if (memberID === undefined || memberID === null || memberID === "") {
        createAlert("Please select a member to assign.", "warning", "main", 3000);
        return;
    }

    if (roleName === undefined || roleName === null || roleName === "") {
        createAlert("Please select a role to assign.", "warning", "main", 3000);
        return;
    }

    // Prepare the data to be sent

    if (selectedOption === "slots") {
        var data = {
            "selectedMember": memberID,
            "chosen_role": roleName,
            "slotNodeID": slotNodeID || null, // If slotNodeID is not provided, it will be null
            "unassign": formData.get("unassign") === "off" // Check if the unassign checkbox is checked
        }
    } else {
        var data = {
            "selectedMember": memberID,
            "chosen_role": roleName,
            "slotNodeID": slotNodeID || null // If slotNodeID is not provided, it will be null
        };
    }

    // Send the data to the server
    try {
        // console.log("Sending data to server:", data);
        var response = await fetch('/data/orbatSubmission', {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            var result = await response.json();
            if (result.slotNodeID) {
                if (result.message) {
                    createAlert(result.message, "success", "main", 5000);
                } else {
                    createAlert("Member assigned successfully!", "success", "main", 5000);
                }
                // Optionally, you can refresh the org chart or perform other actions
                handleChartUpdate(); // Reinitialize the org chart
            } else {
                createAlert("Failed to assign member: " + result.message, "danger", "main", 5000);
            }
        } else {
            createAlert("Error occurred while assigning member.", "danger", "main", 5000);
        }
    } catch (error) {
        console.error("Error:", error);
        createAlert("An unexpected error occurred.", "danger", "main", 5000);
    }
}

async function handleChartUpdate() {
    // Retrieve the template data from the server
    // var data = infantry_squad_template.layout;
    var response = await fetch('/data/getLiveOrbat');
    var rawJSON = await response.json();

    var data = rawJSON.layout;

    var root = {
        id: "root",
        parentNodeId: null
    }

    data.unshift(root);

    await createOrg(data);
}

// Retrieve the data from the server and create the org chart
async function init() {

    // console.log("Initializing org chart...");
    await handleChartUpdate();
    
    if (document.getElementById("memberSelect") != null || document.getElementById("memberSelect") != undefined) {
        populateMemberDropD();
    } else {
        console.log("Member select dropdown not found, skipping population.");
    }

    if (window.location.search.includes("selectedOption")) {
        // Get the selected option from the URL
        var urlParams = new URLSearchParams(window.location.search);
        var selectedOption = urlParams.get("selectedOption") || "roles";
    }

    // Add event listener to the form
    var form = document.getElementById("orbatSelectForm");
    // console.log("Adding event listener to form with ID 'orbatSelectForm'");
    if (form) {
        form.addEventListener("submit", function (event) {
            event.preventDefault(); // Prevent default form submission
            handleFormSubmit(event, selectedOption);
        });
    } else {
        console.error("Form with ID 'orbatSelectForm' not found.");
    }

    if (selectedOption === "slots") {
        // If the selected option is slots, create an event listener for each bubble to set the chosen slot
        // But only if the bubble has an "available" class
        var bubbles = document.querySelectorAll(".node-bubble.available");

        bubbles.forEach(function (bubble) {
            bubble.addEventListener("click", function () {
                var slotNodeID = this.querySelector(".id-div").textContent.trim();
                var roleName = this.querySelector(".name-div").textContent.trim();
                document.getElementById("chosenSlotNodeID").value = slotNodeID;
                document.getElementById("chosenSlotRoleName").value = roleName;

                // If the bubble is clicked, add the "selected" class to it
                // But only one bubble can be selected at a time
                bubbles.forEach(function (b) {
                    b.classList.remove("selected-bubble");
                });
                this.classList.add("selected-bubble");
            });
        });
    }

};

init();