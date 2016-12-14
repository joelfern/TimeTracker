;(function (global) {

	// map tells the System loader where to look for things
	var map = {
		'rxjs': '/rxjs',
		'@angular': '/@angular',
		'ng2-bootstrap': '/ng2-bootstrap',
		'ng2-scrollspy': '/ng2-scrollspy',
		'immutable': '/immutable/dist'
	};

	// packages tells the System loader how to load when no filename and/or no extension
	var packages = {
		'rxjs': { main: 'bundles/Rx.umd.min.js', defaultExtension: 'js' },
		'ng2-bootstrap': { main: 'bundles/ng2-bootstrap.min.js', defaultExtension: 'js' },
		'immutable': { main: 'immutable.js', defaultExtension: 'js' },
		'@angular/common': { main: 'bundles/common.umd.min.js', defaultExtension: 'js' },
		'@angular/compiler': { main: 'bundles/compiler.umd.min.js', defaultExtension: 'js' },
		'@angular/core': { main: 'bundles/core.umd.min.js', defaultExtension: 'js' },
		'@angular/http': { main: 'bundles/http.umd.min.js', defaultExtension: 'js' },
		'@angular/platform-browser': { main: 'bundles/platform-browser.umd.min.js', defaultExtension: 'js' },
		'@angular/platform-browser-dynamic': { main: 'bundles/platform-browser-dynamic.umd.min.js', defaultExtension: 'js' },
		'@angular/router': { main: 'bundles/router.umd.min.js', defaultExtension: 'js' },
		'ng2-scrollspy': { main: 'index.js', defaultExtension: 'js' }
	};

	var config = {
		map: map,
		packages: packages
	};

	// filterSystemConfig - index.html's chance to modify config before we register it.
	if (global.filterSystemConfig) { global.filterSystemConfig(config); }

	System.config(config);

})(this);
