async function populateDash() {
    // Iniitialize the variables

    var response = await fetch("/data/getDashData");
    var data = await response.json();

    // Not implemented yet
    // var promotions = data.promotions;
    // var nextPromotion = data.nextPromotion;
    // var nextPaymentDate = data.nextPaymentDate;
    // var numberOfReplays = data.numberOfReplays;

    var activeMembers = data.activeMembers;
    var leaveMembers = data.leaveMembers;
    var recruits = data.recruits;
    var nextTraining = data.nextTraining;
    var nextMission = data.nextMission;
    var leaders = data.leaders;

    // Initialise the elements

    var activeMembersElement = document.getElementById("active-members");
    var leaveMembersElement = document.getElementById("loas");
    var recruitsElement = document.getElementById("recruits");
    var nextTrainingElement = document.getElementById("nextTraining");
    var nextMissionElement = document.getElementById("nextMission");
    var leadersElement = document.getElementById("leaders");

    // Populate the dashboard

    activeMembersElement.innerHTML = activeMembers;
    leaveMembersElement.innerHTML = leaveMembers;
    recruitsElement.innerHTML = recruits;
    nextTrainingElement.innerHTML = nextTraining.name;
    nextMissionElement.innerHTML = nextMission.name;
    leadersElement.innerHTML = leaders;
}

populateDash();