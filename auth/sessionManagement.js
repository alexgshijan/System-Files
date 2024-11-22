function validateAccountType(accountType) {
    if (sessionStorage.getItem('account_type') !== accountType) {
        window.location.href = 'https://solarportal.alexgs.co.uk';
    }
}