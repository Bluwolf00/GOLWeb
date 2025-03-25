async function popUp(promote, oldRank, newRank, isAdmin) {

    if (!isAdmin) {
        alert('You do not have permission to promote/demote members');
        return;
    }
    var result = confirm(`WARNING\nAre you sure you want to ${promote} this member?\nFrom ${oldRank} to ${newRank}?\nThis will reset their Time In Rank!`);
    if (!result) {
        event.preventDefault();
    } else {
        callToPost(newRank);
    }
}

async function callToPost(newRank) {
    var member = window.location.href.substring(window.location.href.lastIndexOf('=') + 1);
    member = member.replaceAll('#', '');
    console.log(member);
    var data = { member: member, newRank: newRank };
    var res = await fetch('/changeRank', {headers: {'Content-Type': 'application/json'}, method: 'POST', body: JSON.stringify(data)});

    if (res.status === 200) {
        location.reload();
    } else {
        alert('Error: ' + res.status);
    }
}


var button = document.getElementById('promoteButtonDD');

button.addEventListener('click', function() {
    var dropdown = document.getElementById('promo-content');
    if (dropdown.style.display === 'block') {
        dropdown.style.display = 'none';
    } else {
        dropdown.style.display = 'block';
    }
});

var button = document.getElementById('demoteButtonDD');

button.addEventListener('click', function() {
    var dropdown = document.getElementById('demo-content');
    if (dropdown.style.display === 'block') {
        dropdown.style.display = 'none';
    } else {
        dropdown.style.display = 'block';
    }
});

