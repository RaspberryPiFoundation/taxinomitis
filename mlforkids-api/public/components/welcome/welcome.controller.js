(function () {

    angular
        .module('app')
        .controller('WelcomeController', WelcomeController);

    WelcomeController.$inject = [
        'authService', 'loggerService', 'browserStorageService',
        '$rootScope', '$scope', '$state', '$timeout', '$mdDialog'
    ];

    function WelcomeController(authService, loggerService, browserStorageService, $rootScope, $scope, $state, $timeout, $mdDialog) {

        var vm = this;
        vm.authService = authService;

        // id of the Turnstile widget rendered for the current attempt to start a session
        var turnstileWidgetId = null;

        // The "Get Started" button either sends the user to the login page (when accounts are enabled) or, when accounts are disabled, starts an anonymous "Try it now" session directly
        vm.getStarted = function () {
            if ($rootScope.accountsEnabled) {
                $state.go('login');
            }
            else {
                startTryItNowSession();
            }
        };

        vm.showTurnstileErrorHelp = function (ev) {
            $mdDialog.show({
                templateUrl : 'static/components/login/turnstileerror.tmpl.html',
                autoWrap : false,
                targetEvent : ev,
                controller : function ($scope) {
                    $scope.close = function() {
                        $mdDialog.hide();
                    };
                }
            });
        };

        $scope.$on('$destroy', removeTurnstileWidget);

        // Starting a session needs a Cloudflare Turnstile (captcha) token, requested by rendering the Turnstile widget - the same approach as "Try it now" on the login page
        function startTryItNowSession() {
            loggerService.debug('[ml4kwelcome] starting Try It Now');
            $scope.failure = null;
            $scope.turnstileerror = null;

            if (typeof turnstile === 'undefined' || typeof TURNSTILE_SITE_KEY === 'undefined' || !TURNSTILE_SITE_KEY) {
                loggerService.error('[ml4kwelcome] Turnstile is not available');
                $scope.failure = {
                    message : 'Unable to start a session right now. Please refresh the page and try again.'
                };
                return;
            }

            $scope.busy = true;
            var submitted = false;

            // Turnstile callbacks run outside of Angular, so $timeout is used to apply their changes
            removeTurnstileWidget();
            turnstileWidgetId = turnstile.render('#welcome-turnstile-container', {
                sitekey : TURNSTILE_SITE_KEY,
                'error-callback' : function (err) {
                    $timeout(function () {
                        loggerService.error('[ml4kwelcome] Failed to get turnstile token', err);
                        $scope.turnstileerror = err;
                        $scope.busy = false;
                    });
                },
                callback : function (token) {
                    $timeout(function () {
                        if (!submitted) {
                            submitted = true;
                            createSessionUser(token);
                        }
                    });
                }
            });
        }

        function createSessionUser(token) {
            authService.createSessionUser(token)
                .then(function (/* newUser */) {
                    // can't rely on session users to log out, so we clean up after the last session user when the next one starts
                    return attemptSessionUserCleanup();
                })
                .then(function () {
                    $timeout(function () {
                        $state.go('projects');
                    });
                })
                .catch(function (err) {
                    loggerService.error('[ml4kwelcome] session creation failed', err);

                    if (err && err.data && err.data.error && err.data.error.includes('turnstile')) {
                        $scope.turnstileerror = err.data.error;
                    }
                    else {
                        $scope.failure = {
                            message : getErrorMessage(err.data),
                            status : err.status
                        };
                    }

                    // a Turnstile token can only be used once, so trying again needs a new widget
                    removeTurnstileWidget();
                    $scope.busy = false;
                });
        }

        function removeTurnstileWidget() {
            if (turnstileWidgetId !== null) {
                try {
                    turnstile.remove(turnstileWidgetId);
                }
                catch (err) {
                    loggerService.error('[ml4kwelcome] failed to remove turnstile widget', err);
                }
                turnstileWidgetId = null;
            }
        }

        function attemptSessionUserCleanup() {
            return browserStorageService.deleteSessionUserProjects()
                .catch(function (err) {
                    loggerService.error('[ml4kwelcome] failed to cleanup session user resources', err);
                    return;
                });
        }

        function getErrorMessage(errObj) {
            if (errObj && errObj.error) {
                if (errObj.error === 'Class full') {
                    return 'There are too many students trying the site. Sorry, but there is a limit for how many students can use "Try it now" at once. Please do try later.';
                }
                return errObj.error;
            }
            if (errObj && errObj.message) {
                return errObj.message;
            }
            return 'Unknown error';
        }
    }
}());
