async function getAllSOPs() {
    var sops;
    try {
        let response = await fetch('/data/getSOPs');
        if (!response.ok) throw new Error('Network response was not ok');
        let result = await response.json();
        console.log("SOPs fetched successfully:", sops);

        sops = result;
    } catch (error) {
        console.error("Error fetching SOPs:", error);
    } finally {
        return sops;
    }
}

function closeModal() {
    var modal = document.getElementById('viewSopModal');
    if (modal) {
        var bootstrapModal = bootstrap.Modal.getInstance(modal);
        if (bootstrapModal) {
            bootstrapModal.hide();
        }
    }

    var modalIframe = document.getElementById('sopIframe');
    if (modalIframe) {
        modalIframe.src = ""; // Clear the iframe source
    }
}

function createSOPCard(sop, parentDiv) {

    var col = document.createElement('div');
    col.className = 'col-md mb-3 hidden';
    parentDiv.appendChild(col);

    var card = document.createElement('div');
    card.className = 'card';

    if (sop.isAAC === 1) {
        card.classList.add('card-aac');
    } else if (sop.sopType.toLowerCase() !== 'sop') {
        card.classList.add('card-guide');
    } else {
        card.classList.add('card-sop');
    }

    col.appendChild(card);

    var cardHeader = document.createElement('div');
    cardHeader.className = 'card-header d-flex justify-content-between align-items-center';

    var cardTitle = document.createElement('h5');
    cardTitle.className = 'card-title';
    cardTitle.innerHTML = `${sop.sopType}: ${sop.sopTitle}`;
    cardHeader.appendChild(cardTitle);

    var imgDiv = document.createElement('div');
    var img = document.createElement('img');
    img.src = '/img/logo_new_thumb.png';
    img.className = 'img-fluid';
    img.style = 'max-width: 30px; height: auto; float: right;';
    imgDiv.appendChild(img);
    cardHeader.appendChild(imgDiv);

    card.appendChild(cardHeader);

    var cardBody = document.createElement('div');
    cardBody.className = 'card-body';
    card.appendChild(cardBody);

    var cardText = document.createElement('p');
    cardText.className = 'card-text';
    cardText.innerHTML = sop.sopDescription;
    cardBody.appendChild(cardText);

    var cardFooter = document.createElement('div');
    cardFooter.className = 'card-footer d-flex justify-content-between align-items-center';

    var authors = document.createElement('small');
    authors.className = 'text-body-secondary';
    authors.innerHTML = `By ${sop.authorNames.join(' & ')}`;
    cardFooter.appendChild(authors);
    card.appendChild(cardFooter);

    var viewButton = document.createElement('button');
    viewButton.className = 'btn btn-primary';
    viewButton.innerHTML = 'View SOP';

    if (sop.sopUrl === null) {
        viewButton.disabled = true;
        viewButton.innerHTML = 'Restricted';
    }

    viewButton.addEventListener('click', function () {
        renderSOPIframe(sop.sopUrl);
    });
    cardFooter.appendChild(viewButton);
}

function renderSOPIframe(sopURL) {
    var modalIframe = document.getElementById('sopIframe');
    modalIframe.src = "";
    // Using a modal and a bootstrap embed to display the SOP
    var modal = bootstrap.Modal.getInstance(document.getElementById('viewSopModal'));
    if (!modal) {
        modal = new bootstrap.Modal(document.getElementById('viewSopModal'), {
            backdrop: 'static'
        });
    }

    modalIframe.src = sopURL;

    modal.show();
}


async function init() {
    var sops = await getAllSOPs();

    if (!sops || sops.length === 0) {
        console.error("No SOPs found or error fetching SOPs.");
        return;
    }

    var parentDiv = document.getElementById('sopContainer');
    parentDiv.innerHTML = ''; // Clear existing content

    // Titles

    var info = document.createElement('p');
    info.className = 'lead';
    info.innerHTML = 'Standard Operating Procedures (SOPs) are essential for maintaining consistency and quality in our operations. Below is a list of available SOPs:<br>Note: Some of these SOPs may be restricted to <strong>members only.</strong>';
    var infoDiv = document.createElement('div');
    infoDiv.className = 'row text-center';
    infoDiv.appendChild(info);
    parentDiv.appendChild(infoDiv);

    // Create a row for each 3 SOPs
    var row;
    var aacRowCreated = false;
    sops.forEach((sop, index, access) => {

        if (sop.isAAC === 1 && !aacRowCreated) {
            // Found AAC SOPs, start a new row and add a title
            row = document.createElement('div');
            row.className = 'row mb-3';
            var headerRow = document.createElement('div');
            headerRow.innerHTML = '<div class="col"></div><div class="col-md text-center my-4"><h3>AAC SOPs</h3></div><div class="col"></div>';
            parentDiv.appendChild(headerRow);
            parentDiv.appendChild(row);
            aacRowCreated = true;
        }

        if (index % 3 === 0) {
            row = document.createElement('div');
            row.className = 'row mb-3';
            parentDiv.appendChild(row);
        }

        createSOPCard(sop, row);
    });

    // Load the observer script
    var observerScript = document.createElement('script');
    observerScript.src = '/scripts/observer.js';
    observerScript.defer = true;
    document.body.appendChild(observerScript);
}

init();