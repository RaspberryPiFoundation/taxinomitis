(function () {

    angular
        .module('app')
        .controller('WelcomeController', WelcomeController);

    WelcomeController.$inject = [
        'authService', 'loggerService', 'browserStorageService',
        '$rootScope', '$scope', '$state', '$timeout'
    ];

    function WelcomeController(authService, loggerService, browserStorageService, $rootScope, $scope, $state, $timeout) {

        var vm = this;
        vm.authService = authService;

        // The "Get Started" button either sends the user to the login page (when accounts are enabled) or, when accounts are disabled, starts an anonymous "Try it now" session directly
        vm.getStarted = function () {
            if ($rootScope.accountsEnabled) {
                $state.go('login');
            }
            else {
                startTryItNowSession();
            }
        };

        function startTryItNowSession() {
            loggerService.debug('[ml4kwelcome] starting Try It Now');
            $scope.failure = null;

            authService.createSessionUser()
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
                    $scope.failure = {
                        message : getErrorMessage(err.data),
                        status : err.status
                    };
                });
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
