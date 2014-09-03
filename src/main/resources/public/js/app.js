
var xAuthTokenHeaderName = 'x-auth-token';

angular.module('exampleApp', ['ionic', 'ngCookies', 'exampleApp.services'])
	.config(
		[ '$stateProvider', '$urlRouterProvider', '$httpProvider', function($stateProvider, $urlRouterProvider, $httpProvider) {

            $stateProvider.state('create', {url: '/create', templateUrl: 'partials/create.html', controller: CreateController})
                .state('edit', {url: '/edit/:id', templateUrl: 'partials/edit.html', controller: EditController})
                .state('login', {url: '/login', templateUrl: 'partials/login.html', controller: LoginController})
                .state('index', {url: '/index', templateUrl: 'partials/index.html', controller: IndexController});

            $urlRouterProvider.otherwise('/index');

			/* Intercept http errors */
			var interceptor = function ($rootScope, $q, $location) {

		        function success(response) {
		            return response;
		        }

		        function error(response) {

		            var status = response.status;
		            var config = response.config;
		            var method = config.method;
		            var url = config.url;

		            if (status == 401) {
		            	$location.path( "/login" );
		            } else {
		            	$rootScope.error = method + " on " + url + " failed with status " + status;
		            }

		            return $q.reject(response);
		        }

		        return function (promise) {
		            return promise.then(success, error);
		        };
		    };
		    $httpProvider.responseInterceptors.push(interceptor);

            $httpProvider.defaults.headers.common['Content-Type'] = 'application/json';
		} ]

	).run(function($rootScope, $http, $location, $cookieStore, LoginService) {

		/* Reset error when a new view is loaded */
		$rootScope.$on('$viewContentLoaded', function() {
			delete $rootScope.error;
		});

		$rootScope.hasRole = function(role) {

			if ($rootScope.user === undefined) {
				return false;
			}

			if ($rootScope.user.roles[role] === undefined) {
				return false;
			}

			return $rootScope.user.roles[role];
		};

		$rootScope.logout = function() {
			delete $rootScope.user;
			delete $http.defaults.headers.common[xAuthTokenHeaderName];
			$cookieStore.remove('user');
			$location.path("/login");
		};

		 /* Try getting valid user from cookie or go to login page */
		var originalPath = $location.path();
		$location.path("/login");
		var user = $cookieStore.get('user');
		if (user !== undefined) {
			$rootScope.user = user;
			$http.defaults.headers.common[xAuthTokenHeaderName] = user.token;
			$location.path(originalPath);
		}

	});


function IndexController($scope, $state, NewsService) {

	$scope.newsEntries = NewsService.query();

    $scope.data = {
        showDelete: false
    };

	$scope.deleteEntry = function(newsEntry) {
		newsEntry.$remove(function() {
			$scope.newsEntries = NewsService.query();
		});
	};

    $scope.edit = function(newsEntry) {
        $state.go('edit', {id: newsEntry.id});
    };
}


function EditController($scope, $stateParams, $location, NewsService) {

	$scope.newsEntry = NewsService.get({id: $stateParams.id});

	$scope.save = function() {
		$scope.newsEntry.$save(function() {
			$location.path('/');
		});
	};
}


function CreateController($scope, $location, NewsService) {

	$scope.newsEntry = new NewsService();

	$scope.save = function() {
		$scope.newsEntry.$save(function() {
			$location.path('/');
		});
	};
}


function LoginController($scope, $rootScope, $location, $http, $cookieStore, LoginService) {
    $scope.credentials = {
        username: '', password: ''
    };

	$scope.login = function() {
		LoginService.authenticate({username: $scope.credentials.username, password: $scope.credentials.password}, function(user) {
			$rootScope.user = user;
			$http.defaults.headers.common[ xAuthTokenHeaderName ] = user.token;
			$cookieStore.put('user', user);
			$location.path("/");
		});
	};
}


var services = angular.module('exampleApp.services', ['ngResource']);

services.factory('LoginService', function($resource) {

	return $resource(':action', {},
			{
				authenticate: {
					method: 'POST',
					params: {'action' : 'authenticate'}
				}
			}
		);
});

services.factory('NewsService', function($resource) {

	return $resource('news/:id', {id: '@id'});
});