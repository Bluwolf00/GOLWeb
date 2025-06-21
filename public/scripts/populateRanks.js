async function populate() {
    const response = await fetch('/data/getCompRanks');
    if (!response.ok) {
        console.error('Failed to fetch ranks:', response.statusText);
        return;
    }

    var ranks = await response.json();
    var container = document.getElementById('aacRankContainer');
    container.innerHTML = ''; // Clear existing rows

    container.innerHTML = `
    <div class="row">
        <div class="col">
            <h2 class="rankBreak">Enlisted Ranks</h2>
        </div>
    </div>
    `;

    console.log(ranks);

    ranks.reverse(); // Reverse the ranks array to display from lowest to highest

    // Loop over all the infantry ranks and add them to the container
    ranks.forEach(rank => {

        console.log(rank);

        // If a non pilot rank is found, start adding it to the pilot container
        if (rank.rankName === 'Reserve') {
            container = document.getElementById('hellfishRankContainer');
            container.innerHTML = ''; // Clear existing rows
            container.innerHTML = `
            <div class="row">
                <div class="col">
                    <h2 class="rankBreak">Pilot Ranks</h2>
                </div>
            </div>
            `;
        }

        if (rank.prefix === 'Cpl' || rank.rankName === 'Staff Sergeant') {
            container.innerHTML += `
            <div class="row">
                <div class="col">
                    <h2 class="rankBreak">NCO Ranks</h2>
                </div>
            </div>
            `;
        } else if (rank.prefix === '2lt') {
            container.innerHTML += `
            <div class="row">
                <div class="col">
                    <h2 class="rankBreak">Officer Ranks</h2>
                </div>
            </div>
            `;
        }

        const row = document.createElement('div');
        row.className = "row";
        const col1 = document.createElement('div');
        col1.className = "col-sm-2";
        const img = document.createElement('img');
        img.src = `/${rank.rankPath}`;
        img.alt = `${rank.rankName} insignia`;
        img.className = "rankThumb";

        col1.appendChild(img);
        row.appendChild(col1);
        const col2 = document.createElement('div');
        col2.className = "col";
        col2.innerHTML += `
            <h2>${rank.rankName}<span class="rankPrefix"> (${rank.prefix})</span></h2>
            <p class="rankDesc">${rank.rankDescription || 'No description available'}</p>
        `;
        row.appendChild(col2);
        var equivRank = "";

        switch (rank.prefix) {
            case 'Pfc':
                // First Class Airman
                equivRank = "/img/rank/A1C_C.png";
                break;

            case 'Psc':
                // Airman
                equivRank = "/img/rank/Amn_C.png";
                break;

            case 'LCpl':
                // Senior Airman
                equivRank = "/img/rank/SrA_C.png";
                break;

            case 'Sgt':
                // Staff Sergeant
                equivRank = "/img/rank/SSgt.png";
                break;

            case 'Amn':
                // Private Second Class
                equivRank = "/img/rank/Psc.png";
                break;

            case 'A1C':
                // Private First Class
                equivRank = "/img/rank/Pfc.png";
                break;

            case 'SrA':
                // Lance Corporal
                equivRank = "/img/rank/LCpl.png";
                break;

            case 'SSgt':
                // Sergeant
                equivRank = "/img/rank/Sgt.png";

            default:
                var equivRank = null;
                break;
        }

        if (equivRank !== null) {
            const col3 = document.createElement('div');
            col3.className = "col-sm-2";
            const sideImg = document.createElement('img');
            sideImg.classList.add("rankThumb", "toned-down");
            sideImg.src = `${equivRank}`;
            sideImg.alt = `${rank.prefix} equivalent insignia`;
            // sideImg.className = "rankThumb toned-down";
            col3.appendChild(sideImg);
            // col3.innerHTML += `<img class="rankThumb toned-down" src="${equivRank}"></img>`;
            row.appendChild(col3);
        }
        container.appendChild(row);
    });
}

populate();