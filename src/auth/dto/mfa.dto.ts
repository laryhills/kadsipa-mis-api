import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MinLength,
  MaxLength,
} from 'class-validator';

export class MfaTotpConfirmDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{6}$/)
  code: string;
}

export class MfaTotpDisableDto {
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{6}$/)
  totpCode?: string;

  @IsOptional()
  @IsString()
  @MinLength(9)
  @MaxLength(32)
  recoveryCode?: string;
}

export class PatchMfaEmailBackupDto {
  @IsBoolean()
  enabled: boolean;
}

export class MfaChallengeBodyDto {
  @IsString()
  @IsNotEmpty()
  mfaChallengeToken: string;
}

export class MfaVerifyTotpDto extends MfaChallengeBodyDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{6}$/)
  code: string;
}

export class MfaVerifyRecoveryDto extends MfaChallengeBodyDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(9)
  @MaxLength(32)
  code: string;
}

export class MfaEmailBackupVerifyDto extends MfaChallengeBodyDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{6}$/)
  code: string;
}
