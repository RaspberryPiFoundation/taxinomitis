# Machine Learning for Kids production deployment

The Machine Learning for Kids site is made up of a few different pieces. This document is here to describe what they all are and where they go.

- [Machine Learning for Kids production deployment](#machine-learning-for-kids-production-deployment)
  - [The bits that make up the site](#the-bits-that-make-up-the-site)
  - [Where HTTP requests go](#where-http-requests-go)
  - [Where data lives](#where-data-lives)
  - [Where users are authenticated](#where-users-are-authenticated)
  - [Where third-party APIs are accessed](#where-third-party-apis-are-accessed)
  - [Deploying mlforkids-api to Heroku](#deploying-mlforkids-api-to-heroku)
    - [How the build works](#how-the-build-works)
    - [One-time app setup](#one-time-app-setup)
    - [Config vars](#config-vars)
    - [Scheduled cleanup job](#scheduled-cleanup-job)
    - [Limitations](#limitations)
---
## The bits that make up the site

An (almost) complete set of components that makes up the Machine Learning for Kids platform is deployed into three separate regions.

![deployment components](./docs/01-components.png)

| **Component**         | **Source code**                                    | **Docker image**                                                                        | **Language** | **Deployment approach** | **Purpose** |
| --------------------- | -------------------------------------------------- | --------------------------------------------------------------------------------------- | ------------ | ----------------------- | ----------- |
| mlforkids-api         | [`./mlforkids-api`](./mlforkids-api)               | [dalelane/mlforkids-api](https://hub.docker.com/r/dalelane/mlforkids-api)               | Node.js      | k8s Deployment (in Code Engine) | Main website and API              |
| mlforkids-newnumbers  | [`./mlforkids-newnumbers`](./mlforkids-newnumbers) | [dalelane/mlforkids-newnumbers](https://hub.docker.com/r/dalelane/mlforkids-newnumbers) | Python       | k8s Deployment (in Code Engine) | Creates ML models and visualisations for numbers projects |
| mlforkids-scratch     | [`./mlforkids-scratch`](./mlforkids-scratch)       | [dalelane/mlforkids-scratch](https://hub.docker.com/r/dalelane/mlforkids-scratch)       | nginx        | k8s Deployment (in Code Engine) | Hosts static parts of website that don't change frequently (i.e. Scratch fork) |
| mlforkids-proxy       | [`./mlforkids-proxy`](./mlforkids-proxy)           | [dalelane/mlforkids-proxy](https://hub.docker.com/r/dalelane/mlforkids-proxy)           | nginx        | k8s Deployment (in Code Engine) | Proxies requests from Scratch to external third-party APIs |
| mlforkids-api-cleanup | [`./mlforkids-api`](./mlforkids-api)               | [dalelane/mlforkids-api](https://hub.docker.com/r/dalelane/mlforkids-api)               | Node.js      | k8s Job (in Code Engine) | Periodic job (cron triggered every hour) to cleanup redundant data in Cloud Object Storage, and delete expired users and Watson Assistant workspaces |


---
## Where HTTP requests go

Components with external (Internet-facing) HTTP endpoints are:
- mlforkids-api
- mlforkids-scratch
- mlforkids-proxies

An instance of [Cloud Internet Services](https://www.ibm.com/cloud/cloud-internet-services) performs DNS routing - routing HTTP requests to the instance in their nearest region. (*It also manages the certificate for the machinelearningforkids.co.uk domain and performs TLS termination.*)

| **url**                              | **routed to**     | **notes** |
| ------------------------------------ | ----------------- | --------- |
| login.machinelearningforkids.co.uk   | _Auth0_           | see [Where users are authenticated](#where-users-are-authenticated) |
| machinelearningforkids.co.uk/scratch | mlforkids-scratch | *caching means most requests are served immediately from Cloud Internet Services layer* |
| proxy.machinelearningforkids.co.uk   | mlforkids-proxies |
| machinelearningforkids.co.uk         | mlforkids-api     |

*The HTTP endpoint provided by **mlforkids-numbers** is only accessible within the namespace where it is running, and is only called by the **mlforkids-api** instance in the same region as it.*

*This is described in [Deploying an application across multiple regions with a custom domain name](https://cloud.ibm.com/docs/codeengine?topic=codeengine-deploy-multiple-regions) in the Code Engine documentation.*

![deployment components](./docs/02-http-traffic.png)


---
## Where data lives

Data is stored in:
- PostgreSQL database provided by [IBM Cloud Databases](https://www.ibm.com/cloud/databases) (for data relating to student ML projects)
- [Cloud Object Storage](https://www.ibm.com/cloud/object-storage) bucket for storing training data for image and sound ML projects

These are both hosted in the us-south region (this means that instances of the **mlforkids-api** application and **mlforkids-api-cleanup** job in every region all connect to storage in us-south region).

*Similarly, instances of Watson Assistant workspaces that are used to support text projects are created in the us-south region.*

![deployment components](./docs/03-persistence.png)


---
## Where users are authenticated

Authentication is provided by a third-party service, [Auth0](https://auth0.com).

Back-end/API authentication is handled by the **mlforkids-api** service, which makes requests directly to Auth0 APIs using express middleware.

Web authentication is handled through Auth0. The `login.machinelearningforkids.co.uk` subdomain is delegated to Auth0 - with a CNAME pointing at the Auth0 servers.

![deployment components](./docs/04-auth.png)


---
## Where third-party APIs are accessed

Data from third-party services (Spotify and Wikipedia) is made available in Scratch through **mlforkids-proxies**. *This is an nginx proxy, and is described in more detail in a blog post on [using nginx for caching API proxies](https://dalelane.co.uk/blog/?p=3646).*

![deployment components](./docs/05-third-party.png)

---

## Deploying mlforkids-api to Heroku

This section covers deploying **mlforkids-api** (the main website and API) to Heroku as a Docker image. Heroku builds the image from [`heroku.yml`](./heroku.yml), and deploys happen through a Heroku pipeline connected to this GitHub repo. Setting up the pipeline and its GitHub integration isn't covered here.

This deployment doesn't use any IBM Cloud services, and it runs without accounts, so only anonymous "Try it now" sessions are available. See [Limitations](#limitations) for what that rules out.

### How the build works

Heroku reads [`heroku.yml`](./heroku.yml) from the repo root and builds the `web` process from [`mlforkids-api/Dockerfile`](./mlforkids-api/Dockerfile). Heroku uses the directory containing the Dockerfile as the build context, which here is `mlforkids-api/`. `heroku.yml` has to stay at the repo root, because that's the only place Heroku will look for it.

`heroku.yml` also sets the `DEPLOYMENT` build arg to `heroku`, so the front-end is built without machinelearningforkids.co.uk's Sentry error reporting and production Auth0 config. Any value other than `machinelearningforkids.co.uk` has the same effect. `DEPLOYMENT` is only read at build time, so changing it means editing `heroku.yml` and redeploying.

### One-time app setup

Do these steps before the first deploy. Until the database schema is loaded (step 3), the app crashes on startup.

1. Set the app's stack to `container`, so that Heroku builds it from `heroku.yml`:
   ```sh
   heroku stack:set container -a your-app-name
   ```

2. Add Heroku Postgres. It sets `DATABASE_URL`, which the app uses (over SSL) instead of the individual `POSTGRESQL*` variables:
   ```sh
   heroku addons:create heroku-postgresql:essential-0 -a your-app-name
   ```

3. Load the database schema once, from the repo root. This needs `psql` installed locally:
   ```sh
   heroku pg:psql -a your-app-name < mlforkids-api/sql/postgresql.sql
   ```
   The script's `ALTER DATABASE mlforkidsdb ...` statement will fail, because Heroku names the database differently. That's expected, because the app sets the schema search path on each connection instead. Let the script carry on past the error, because the statements after it create the `session-users` class that "Try it now" needs. That means not running it with `ON_ERROR_STOP` set.

4. Set the [config vars](#config-vars):
   ```sh
   heroku config:set ACCOUNTS_ENABLED=false NODE_ENV=production -a your-app-name
   ```

5. Add the [scheduled cleanup job](#scheduled-cleanup-job).

If the app was deployed before the schema was loaded, restart it afterwards with `heroku restart -a your-app-name`.

After this, deploys go through the pipeline's GitHub integration, either automatically or manually. You can watch startup with `heroku logs --tail -a your-app-name`.

### Config vars

| Config var | Value | Notes |
| ---------- | ----- | ----- |
| `DATABASE_URL` | Set by Heroku Postgres | Replaces the individual `POSTGRESQL*` variables. |
| `ACCOUNTS_ENABLED` | `false` | Turns off teacher sign-up, student and class management, and Auth0 login, in both the API and the UI. Only anonymous "Try it now" sessions remain. |
| `NODE_ENV` | `production` | Sends the app's logs to stdout and stderr, so they show up in `heroku logs`. Without it, the logs are written to a file inside the dyno. |

You don't need to set `PORT` (Heroku sets it) or `HOST` (it defaults to `0.0.0.0`). You don't need any Auth0, SMTP or IBM Cloud config either.

Don't set `DEPLOYMENT` as a config var, it belongs in `heroku.yml` as a build arg instead.

### Scheduled cleanup job

Each "Try it now" session creates a temporary user that expires after 4 hours. Expired users stay in the database until a cleanup job deletes them. The site allows at most 3,500 temporary users, and expired ones count towards that limit. Without the cleanup job, "Try it now" will eventually fail for everyone with "There are too many students trying the site".

Run the job every hour with [Heroku Scheduler](https://devcenter.heroku.com/articles/scheduler):

1. Add the add-on:
   ```sh
   heroku addons:create scheduler:standard -a your-app-name
   ```

2. In the Scheduler dashboard, add an hourly job with this command:
   ```sh
   npm run codeenginejob
   ```

Each deleted session also queues a request to delete its files from object storage. Those requests can never run here where object storage is not available, so they build up in the `pendingjobs` table at one row per session. Nothing is ever written to object storage in this deployment, so they're safe to clear:
```sh
heroku pg:psql -a your-app-name -c "DELETE FROM mlforkidsdb.pendingjobs;"
```

### Limitations

These features depend on services that this deployment doesn't have:

- **"Recognising text" projects:** models are trained by IBM Watson Assistant, whether the project is stored in the browser or in the cloud. Training a text model fails.
- **"Recognising numbers" projects:** models are trained by the separate numbers service in [`mlforkids-newnumbers`](./mlforkids-newnumbers). It has no IBM dependencies, but deploying it isn't covered here. Without it, training fails. To use one, set `NUMBERS_SERVICE`, `NUMBERS_SERVICE_USER`, `NUMBERS_SERVICE_PASS` and `NUMBERS_SERVICE_HOSTS`.
- **Cloud project storage:** images and sounds for cloud projects are stored in IBM Cloud Object Storage, so store projects in the browser instead.
- **Scratch:** Scratch is served at `/scratch/` by the separate [`mlforkids-scratch`](./mlforkids-scratch) component, a static nginx site that this app doesn't serve. Links into Scratch end up in a redirect loop unless something routes `/scratch/` on the same domain to a copy of it.

"Recognising images", "recognising sounds", "predicting numbers" and "generating text" projects all train in the browser and don't need anything else.

Some features also call machinelearningforkids.co.uk directly, wherever the site is deployed. For example, "generating text" projects look up Wikipedia through `proxy.machinelearningforkids.co.uk`.
