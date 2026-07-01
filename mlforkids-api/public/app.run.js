(function () {

    angular
        .module('app')
        .run(run);

    run.$inject = [
        '$rootScope', '$state', '$transitions',
        'authService', 'authManager', 'sitealertsService', 'loggerService'
    ];

    function run($rootScope, $state, $transitions, authService, authManager, sitealertsService, loggerService) {
        // Whether the accounts system is available. This is injected into the page at runtime by the server (window.ACCOUNTS_ENABLED) so it can be controlled by an environment variable
        $rootScope.accountsEnabled = (typeof window.ACCOUNTS_ENABLED !== 'undefined') ?
            window.ACCOUNTS_ENABLED : true;

        // When accounts are disabled, make the account-only pages unreachable by redirecting any attempt to navigate to them back to the welcome page
        if (!$rootScope.accountsEnabled) {
            var accountOnlyStates = {
                login : true,
                signup : true,
                teacher : true,
                teacher_restrictions : true,
                teacher_apikeys : true,
                teacher_students : true,
                teacher_supervision : true,
                teacher_review_training : true,
                siteadmin : true
            };
            $transitions.onBefore({}, function (transition) {
                var target = transition.to().name;
                if (accountOnlyStates[target]) {
                    loggerService.debug('[ml4kapp] blocking navigation to account page', target);
                    return $state.target('welcome');
                }
            });
        }

        // Put the authService on $rootScope so its methods
        // can be accessed from the nav bar
        $rootScope.authService = authService;

        // Put the loggerService on $rootScope so the nav
        // bar can download the log
        $rootScope.loggerService = loggerService;

        // register auth listener
        authService.setupAuth();

        // check auth when they load or refresh the page
        authManager.checkAuthOnRefresh();

        // send them back to the login screen if they get an HTTP 401
        //  from an API call
        authManager.redirectWhenUnauthenticated();

        // display confirmation if the user is verifying their
        //  email address with Auth0
        authService.checkForAuthMessagesInUrl();

        // prepare the service for fetching site alerts
        sitealertsService.init();
    }
})();
