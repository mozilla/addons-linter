# About 3rd Party Libraries in Add-ons

We maintain a list of banned and unadvised third-party JavaScript libraries; these libraries are not allowed/recommended in add-ons (because of security vulnerabilities).

## Banned libraries

### AngularJS `1.x`

AngularJS `1.x` versions except the latest version (currently `1.5.8`) are not allowed due to a [potential CSP vulnerability](http://www.slideshare.net/x00mario/an-abusive-relationship-with-angularjs). The latest version will be allowed for a limited time only.

## Unadvised libraries

### jQuery < 2.0

jQuery versions older than 2.0 are not supported by the jQuery team for development inside extensions. Please use a recent version.
