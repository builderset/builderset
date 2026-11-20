<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

/**
 * Laravel's own user, with the public id the answers show: a person is
 * `{ id: <uuid>, name }`, never the internal id.
 */
class User extends Authenticatable
{
    use HasFactory;
    use HasUuids;
    use Notifiable;

    protected $fillable = ['name', 'email', 'password'];

    protected $hidden = ['password', 'remember_token'];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    /** HasUuids fills `uuid`; the key stays the bigint `id` the audit columns point at. */
    public function uniqueIds(): array
    {
        return ['uuid'];
    }

    /** How an answer names this person. */
    public function asPerson(): array
    {
        return ['id' => $this->uuid, 'name' => $this->name];
    }
}
