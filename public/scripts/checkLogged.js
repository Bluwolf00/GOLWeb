function isLogged(isloggedIn) {
    if (isloggedIn == "true") {
        var loginE = document.getElementById('loginEntry');
        loginE.innerText = 'Log Out';
        return true;
    } else {
        return false
    }
}

isLogged(isloggedIn);
