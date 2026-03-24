(function () {
    // Single place to switch prod vs local — change only this value.
    //http://127.0.0.1:5000/
    //https://kohlenz.com/leettest/
    const BACKEND_BASE_URL = 'https://kohlenz.com/leettest/';
    window.LEETTEST_BACKEND_BASE_URL = String(BACKEND_BASE_URL).replace(/\/+$/, '');
})();
