# TimeTracker
## by RadialSpark, LLC.

TimeTracker is a basic application which provides a fully-functioning foundation for customized time-tracking on Heroku that syncs back to Salesforce. It is built on an evolution of the MEAN stack that we are calling the PLAN stack: PostgreSQL, Loopback, Angular 2, and Node.js.

### Deploy

<p align=center>
<a href="https://login.salesforce.com/packaging/installPackage.apexp?p0=04t41000001Xbyj" target="_blank">
<img src="./docs/images/dts_light.png" alt="Deploy to Salesforce" height="50px"/>
</a>
&nbsp;&nbsp;&nbsp;
<a href="https://heroku.com/deploy" target="_blank">
<img src="./docs/images/dth_light.png" alt="Deploy to Heroku" height="50px"/>
</a>
&nbsp;&nbsp;&nbsp;
<a href="https://cdn.rawgit.com/RadialSpark/timetracker/master/docs/download-heroku-connect.html">
<img src="./docs/images/hcc_light.png" alt="Download Heroku Connect Config" height="50px"https://cdn.rawgit.com/RadialSpark/timetracker-temp/master/heroku-connect-config.json/>
</a>
</p>

1. Install the TimeTracker unmanaged package to your Salesforce org.
<br />[Step-by-step Salesforce instructions](https://radialspark.github.io/timetracker/setup.html#salesforce)

2. Deploy a copy of the app to Heroku.
<br />[Step-by-step Heroku instructions](https://radialspark.github.io/timetracker/setup.html#heroku)

3. Connect the Heroku Connect add-on to your Salesforce org, and import the configuration json.
<br />[Step-by-step Heroku Connect instructions](https://radialspark.github.io/timetracker/setup.html#heroku-connect)

4. Restart your Heroku App dynos.
<br />[Step-by-step Heroku Dyno Restart instructions](https://radialspark.github.io/timetracker/setup.html#heroku-dyno-restart)

4. Follow the [user setup instructions](https://radialspark.github.io/timetracker/setup.html#user-setup) to create a user and delete the default user.
