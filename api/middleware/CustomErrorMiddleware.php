<?php
class CustomErrorMiddleware extends \Slim\Middleware
{
    public function call()
    {
        // Set new error output
        $env = $this->app->environment();
        $env['slim.errors'] = fopen('slim_etranzport.log', 'w');

        // Call next middleware
        $this->next->call();
    }
}