/**
 * Created by yangyang on 3/2/16.
 */
(function () {
    angular
        .module("myApp")
        .config(configuration)
        .run(restrict);

    function configuration($routeProvider, $httpProvider) {

        $routeProvider
            .when("/", {
                templateUrl: "views/home/home.view.html",
            })
            .when("/login", {
                templateUrl: "views/login/login.view.html",
                controller: "LoginController",
                controllerAs: "model"
            })
            .when("/dashboard", {
                templateUrl: "views/dashboard/dashboard.view.html",
                controller: "DashboardController",
                controllerAs: "model",
                resolve: {
                    loggedIn: checkLoggedIn
                }
            })
            .when("/api_return/:tokenstring", {
                templateUrl: "views/redirect/redirect.view.html",
                controller: "RedirectController",
                controllerAs: "model"
            })
            .otherwise({
                redirectTo: "/"
            });

        function checkLoggedIn(Auth, User, $location, $q) {
            var deferred = $q.defer();
            var token = Auth.getToken();
            if (token) {
                User.validateToken()
                    .then(
                        function (response) {
                            if (response && response.data.success) {
                                deferred.resolve();
                            } else {
                                deferred.reject();
                                $location.url('/login');
                            }
                        },
                        function (err) {
                            deferred.reject();
                            $location.url('/login');
                        }
                    );
            } else {
                var cookieToken = Auth.getTokenFromCookie();
                if (cookieToken) {
                    Auth.saveToken(cookieToken, function () {
                        User.validateToken(cookieToken)
                            .then(function (response) {
                                if (response && response.data.success) {
                                    deferred.resolve();
                                }
                                else {
                                    $window.localStorage.removeItem('jwtToken');
                                    Auth.deleteRememberMeCookie();
                                    deferred.reject();
                                    $location.url('/login');
                                }
                            });
                    });
                } else {
                    deferred.reject();
                    $location.url('/login');
                }
            }
            return deferred.promise;
        }

        $httpProvider.interceptors.push(authInterceptor);

        function authInterceptor(Auth, $window) {
            return {
                // automatically attach Authorization header
                request: function (config) {
                    var token = $window.sessionStorage['jwtToken'];
                    //console.log("the token in the header is ");
                    //console.log(token);
                    if (token) {
                        config.headers.Authorization = token;
                    }
                    return config;
                },

                // If a token was sent back, save it
                response: function (res) {
                    if (res.data.token) {
                        Auth.saveToken(res.data.token);
                    }

                    return res;
                },

                responseError: function (res) {
                    if (res.status === 401) {
                        $window.location = "#/login";
                    }
                }
            }
        }

    }

    function restrict($rootScope, $location, $window, Auth, User) {
        $rootScope.$on("$routeChangeStart", function (event, next) {
            if (!Auth.isAuthed()) {
                console.log("You don't have a token in session storage");
                if (next.templateUrl === "views/dashboard/dashboard.view.html") {
                    $location.path("/login");
                } else if (next.templateUrl === "views/login/login.view.html") {
                    console.log("checking cookie..........");
                    checkLoginAgain();
                }
            } else {
                console.log("You  have a token in session storage");
                if (next.templateUrl === "views/login/login.view.html") {
                    $location.path("/dashboard");
                }
            }
        });

        function checkLoginAgain() {
            var cookieState = Auth.validateRememberMeCookie();
            if (cookieState) {
                var token;
                console.log("this is a valid cookie");
                var cookielist = document.cookie.split(';');
                for (var i in cookielist) {
                    if (cookielist[i].indexOf('remember-me') != -1) {
                        //get the token from the cookie list
                        token = cookielist[i].split('=')[1];
                    }
                }

                Auth.saveToken(token, function () {
                    User.validateToken()
                        .then(function (response) {
                            if (response && response.data.success) {
                                console.log("login successfully by token in the cookie!");
                                window.location = "#/dashboard";
                            }
                            else {
                                $window.localStorage.removeItem('jwtToken');
                                Auth.deleteRememberMeCookie();
                                window.location = "#/login";
                                console.log("The token in the cookie is invalid");
                            }
                        });
                });

            } else {
                console.log("no cookie found or the cookie has expired");
            }
        }
    }

})();
